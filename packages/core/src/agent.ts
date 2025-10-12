import path from 'node:path';
import {
  IAgentConfig,
  IAgentMessage,
  ITaskErrorData,
  ITaskResultData,
  ITaskRequestData,
  IAgentRegistry,
  AgentErrorTypes,
  AgentMessageTypes,
  IAgentRegistryEntry,
} from './types';
import { AgentError, AgentIdentity, RemoteRegistry } from './utils';
import { AgentConfig } from './utils/agent-config';
import { AgentServer } from './utils/agent-server';
import { InMemoryRegistry } from './utils/in-memory-registry';
import got from 'got';

type CapabilityHandler = (
  params: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export class Agent {
  private config: AgentConfig;
  private agentIdentity: AgentIdentity;
  private capabilityHandlers: Map<string, CapabilityHandler> = new Map();
  private _registry: Map<string, IAgentRegistry> = new Map();
  private activeRegistry: IAgentRegistry;

  constructor(
    config: IAgentConfig | string = path.join(process.cwd(), '.hive.yml'),
    registry?: IAgentRegistry
  ) {
    this.config = new AgentConfig(config);
    this.agentIdentity = new AgentIdentity(this.config);
    this._registry.set(
      'internal',
      new InMemoryRegistry('internal', this.config.endpoint())
    );

    if (registry) {
      this._registry.set(registry.name, registry);
      this.activeRegistry = registry;
    } else {
      this.activeRegistry = this._registry.get('internal') as IAgentRegistry;
    }
  }

  public useRegistry(name: string) {
    this.activeRegistry = this._registry.get(name) as IAgentRegistry;
    return this;
  }

  public addRegistry(
    registryOrEndpoint: IAgentRegistry | string,
    name?: string
  ) {
    if (typeof registryOrEndpoint === 'string') {
      const endpoint = registryOrEndpoint;
      const registryName = name || endpoint;
      const newRegistry = new RemoteRegistry(registryName, endpoint);
      this._registry.set(newRegistry.name, newRegistry);
    } else {
      this._registry.set(registryOrEndpoint.name, registryOrEndpoint);
    }
    return this;
  }

  public removeRegistry(name: string) {
    this._registry.delete(name);
    return this;
  }

  public getRegistry(name: string) {
    return this._registry.get(name) as IAgentRegistry;
  }

  public listRegistries() {
    return Array.from(this._registry.values());
  }

  public get registry(): IAgentRegistry {
    return this.activeRegistry;
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

  public async register(
    registry: string | IAgentRegistry = this.activeRegistry
  ) {
    const { keys, ...info } = this.config.info();

    const agentInfo = {
      ...info,
      keys: {
        publicKey: keys.publicKey,
      },
    };

    if (typeof registry === 'string') {
      registry = this.getRegistry(registry);
    }

    if (!registry) {
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, `Registry not found.`);
    }

    try {
      await registry.add(agentInfo);
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to register with registry '${
          typeof registry === 'string' ? registry : registry.name
        }': ${error}`
      );
    }
  }

  public async search(
    query: string,
    registry: string | IAgentRegistry = this.activeRegistry
  ): Promise<IAgentRegistryEntry[]> {
    if (typeof registry === 'string') {
      registry = this.getRegistry(registry);
    }

    if (!registry) {
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, `Registry not found.`);
    }

    try {
      const results = await registry.search(query);
      return results;
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.AGENT_NOT_FOUND,
        `Failed to search for agents with query "${query}" from registry '${registry.name}': ${error}`
      );
    }
  }

  public async publicKey(agentId: string): Promise<string | undefined> {
    const agent = await this.activeRegistry.get(agentId);
    return agent?.keys.publicKey;
  }

  public identity(): AgentIdentity {
    return this.agentIdentity;
  }

  public endpoint(): string {
    return this.config.endpoint();
  }

  public port(): number {
    return this.config.port();
  }

  public host(): string {
    return this.config.host();
  }

  public createServer(): AgentServer {
    return new AgentServer(this);
  }

  public async sendTask(
    toAgentId: string,
    capability: string,
    params: Record<string, unknown>,
    taskId?: string
  ): Promise<ITaskResultData | ITaskErrorData> {
    const targetAgent = await this.activeRegistry.get(toAgentId);
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

      if (
        !this.agentIdentity.verifyMessage(response, targetAgent.keys.publicKey)
      ) {
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
