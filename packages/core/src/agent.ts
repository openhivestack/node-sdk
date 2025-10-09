import {
  IAgentConfig,
  IHiveMessage,
  ITaskErrorData,
  ITaskResultData,
  HiveErrorType,
  HiveMessageType,
  ITaskRequestData,
  IAgentRegistry,
} from './types';
import { AgentIdentity, Crypto } from './utils';
import { Config } from './utils/config-manager';
import { AgentServer } from './as-server.js';
import { InMemoryRegistry } from './in-memory-registry';
import got from 'got';

type CapabilityHandler = (
  params: Record<string, any>
) => Promise<Record<string, any>>;

export class Agent {
  private config: Config;
  private agentIdentity: AgentIdentity;
  private capabilityHandlers: Map<string, CapabilityHandler> = new Map();
  private registry: IAgentRegistry;

  constructor(
    config: IAgentConfig,
    privateKey?: string,
    publicKey?: string,
    registry: IAgentRegistry = new InMemoryRegistry()
  ) {
    this.config = new Config(config);

    const keys =
      privateKey && publicKey
        ? { privateKey, publicKey }
        : Crypto.generateKeyPair();

    this.agentIdentity = new AgentIdentity(
      this.config,
      keys.privateKey,
      keys.publicKey
    );

    this.registry = registry;
  }

  public async process(
    message: IHiveMessage,
    senderPublicKey: string
  ): Promise<ITaskResultData | ITaskErrorData> {
    const task_id = message.data.task_id || 'unknown';

    if (!this.agentIdentity.verifyMessage(message, senderPublicKey)) {
      return {
        task_id,
        error: HiveErrorType.INVALID_SIGNATURE,
        message: 'Message signature verification failed',
        retry: false,
      };
    }

    if (message.type !== HiveMessageType.TASK_REQUEST) {
      return {
        task_id,
        error: HiveErrorType.INVALID_MESSAGE_FORMAT,
        message: `Invalid message type: ${message.type}. Expected 'task_request'.`,
        retry: false,
      };
    }

    const { capability, params } = message.data as ITaskRequestData;
    const handler = this.capabilityHandlers.get(capability);

    if (!handler) {
      return {
        task_id,
        error: HiveErrorType.CAPABILITY_NOT_FOUND,
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
        error: HiveErrorType.PROCESSING_FAILED,
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
      throw new Error(
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
      throw new Error(`Agent ${toAgentId} not found in registry.`);
    }

    if (!targetAgent.endpoint) {
      throw new Error(`Endpoint for agent ${toAgentId} not configured.`);
    }

    const taskRequest = this.agentIdentity.createTaskRequest(
      toAgentId,
      capability,
      params,
      taskId
    );

    try {
      const response: IHiveMessage = await got
        .post(`${targetAgent.endpoint}/tasks`, {
          json: taskRequest,
        })
        .json();

      if (!this.agentIdentity.verifyMessage(response, targetAgent.publicKey)) {
        throw new Error('Response signature verification failed.');
      }

      return response.data as ITaskResultData | ITaskErrorData;
    } catch (error) {
      throw new Error(`Failed to send task to agent ${toAgentId}: ${error}`);
    }
  }
}
