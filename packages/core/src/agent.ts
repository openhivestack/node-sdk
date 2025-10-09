import {
  IAgentConfig,
  IAgentMessage,
  ITaskErrorData,
  ITaskResultData,
  ITaskRequestData,
  IAgentRegistry,
  AgentErrorTypes,
  AgentMessageTypes,
} from './types';
import { AgentError, AgentIdentity, AgentSignature } from './utils';
import { AgentConfig } from './utils/agent-config';
import { AgentServer } from './utils/agent-server';
import { InMemoryRegistry } from './utils/in-memory-registry';
import got from 'got';

type CapabilityHandler = (
  params: Record<string, any>
) => Promise<Record<string, any>>;

export class Agent {
  private config: AgentConfig;
  private agentIdentity: AgentIdentity;
  private capabilityHandlers: Map<string, CapabilityHandler> = new Map();
  private registry: IAgentRegistry;

  constructor(
    config: IAgentConfig,
    privateKey?: string,
    publicKey?: string,
    registry: IAgentRegistry = new InMemoryRegistry()
  ) {
    this.config = new AgentConfig(config);

    const keys =
      privateKey && publicKey
        ? { privateKey, publicKey }
        : AgentSignature.generateKeyPair();

    this.agentIdentity = new AgentIdentity(
      this.config,
      keys.privateKey,
      keys.publicKey
    );

    this.registry = registry;
  }

  public async process(
    message: IAgentMessage,
    senderPublicKey: string
  ): Promise<ITaskResultData | ITaskErrorData> {
    const task_id = message.data.task_id || 'unknown';

    if (!this.agentIdentity.verifyMessage(message, senderPublicKey)) {
      return {
        task_id,
        error: AgentErrorTypes.INVALID_SIGNATURE,
        message: 'Message signature verification failed',
        retry: false,
      };
    }

    if (message.type !== AgentMessageTypes.TASK_REQUEST) {
      return {
        task_id,
        error: AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        message: `Invalid message type: ${message.type}. Expected 'task_request'.`,
        retry: false,
      };
    }

    const { capability, params } = message.data as ITaskRequestData;
    const handler = this.capabilityHandlers.get(capability);

    if (!handler) {
      return {
        task_id,
        error: AgentErrorTypes.CAPABILITY_NOT_FOUND,
        message: `Capability '${capability}' not found or no handler registered.`,
        retry: false,
      };
    }

    try {
      const result = await handler(params);
      return {
        task_id,
        status: 'completed',
        result,
      };
    } catch (error) {
      return {
        task_id,
        error: AgentErrorTypes.PROCESSING_FAILED,
        message:
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during capability execution.',
        retry: false,
      };
    }
  }

  public capability(id: string, handler: CapabilityHandler) {
    if (!this.config.hasCapability(id)) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        `Capability '${id}' is not defined in the agent configuration.`
      );
    }

    this.capabilityHandlers.set(id, handler);
    return this; // For chaining
  }

  public async register() {
    await this.registry.add({
      ...this.config.info(),
      publicKey: this.agentIdentity.getPublicKey(),
    });
  }

  public async publicKey(agentId: string): Promise<string | undefined> {
    return (await this.registry.get(agentId)).publicKey;
  }

  public identity(): AgentIdentity {
    return this.agentIdentity;
  }

  public endpoint(): string {
    return this.config.endpoint();
  }

  public createServer(): AgentServer {
    return new AgentServer(this);
  }

  public async sendTask(
    toAgentId: string,
    capability: string,
    params: Record<string, any>,
    taskId?: string
  ): Promise<ITaskResultData | ITaskErrorData> {
    const targetAgent = await this.registry.get(toAgentId);
    if (!targetAgent) {
      throw new AgentError(
        AgentErrorTypes.AGENT_NOT_FOUND,
        `Agent ${toAgentId} not found in registry.`
      );
    }

    if (!targetAgent.endpoint) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        `Endpoint for agent ${toAgentId} not configured.`
      );
    }

    const taskRequest = this.agentIdentity.createTaskRequest(
      toAgentId,
      capability,
      params,
      taskId
    );

    try {
      const response: IAgentMessage = await got
        .post(`${targetAgent.endpoint}/tasks`, {
          json: taskRequest,
        })
        .json();

      if (!this.agentIdentity.verifyMessage(response, targetAgent.publicKey)) {
        throw new AgentError(
          AgentErrorTypes.INVALID_SIGNATURE,
          'Response signature verification failed.'
        );
      }

      return response.data as ITaskResultData | ITaskErrorData;
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to send task to agent ${toAgentId}: ${error}`
      );
    }
  }
}
