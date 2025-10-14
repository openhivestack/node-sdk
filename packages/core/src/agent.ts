import path from 'node:path';
import debug from 'debug';
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

const log = debug('openhive:agent');

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

    log('Agent initialized');
    log(`Agent ID: ${this.agentIdentity.id()}`);

    if (registry) {
      this._registry.set(registry.name, registry);
      this.activeRegistry = registry;
      log(`Using provided registry: ${registry.name}`);
    } else {
      this.activeRegistry = this._registry.get('internal') as IAgentRegistry;
      log('Using internal in-memory registry');
    }
  }

  public useRegistry(name: string) {
    const registry = this._registry.get(name);
    if (registry) {
      this.activeRegistry = registry;
      log(`Switched to registry: ${name}`);
    } else {
      log(`Registry not found: ${name}`);
    }
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
      log(`Added remote registry: ${newRegistry.name} at ${endpoint}`);
    } else {
      this._registry.set(registryOrEndpoint.name, registryOrEndpoint);
      log(`Added registry: ${registryOrEndpoint.name}`);
    }
    return this;
  }

  public removeRegistry(name: string) {
    if (this._registry.has(name)) {
      this._registry.delete(name);
      log(`Removed registry: ${name}`);
    }
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
    log(`Processing message for task ID: ${task_id}`);

    if (!this.agentIdentity.verifyMessage(message, senderPublicKey)) {
      log(`Signature verification failed for task ID: ${task_id}`);
      return {
        task_id,
        error: AgentErrorTypes.INVALID_SIGNATURE,
        message: 'Message signature verification failed',
        retry: false,
      };
    }

    log(`Signature verified for task ID: ${task_id}`);

    if (message.type !== AgentMessageTypes.TASK_REQUEST) {
      log(
        `Invalid message type '${message.type}' for task ID: ${task_id}. Expected 'task_request'.`
      );
      return {
        task_id,
        error: AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        message: `Invalid message type: ${message.type}. Expected 'task_request'.`,
        retry: false,
      };
    }

    const { capability, params } = message.data as ITaskRequestData;
    const handler = this.capabilityHandlers.get(capability);

    log(`Handling capability '${capability}' for task ID: ${task_id}`);

    if (!handler) {
      log(`No handler found for capability '${capability}'`);
      return {
        task_id,
        error: AgentErrorTypes.CAPABILITY_NOT_FOUND,
        message: `Capability '${capability}' not found or no handler registered.`,
        retry: false,
      };
    }

    try {
      log(`Executing handler for capability '${capability}'`);
      const result = await handler(params);
      log(`Capability '${capability}' executed successfully`);
      return {
        task_id,
        status: 'completed',
        result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      log(`Error executing capability '${capability}': ${errorMessage}`, error);
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
      const errorMessage = `Capability '${id}' is not defined in the agent configuration.`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    log(`Registering handler for capability: ${id}`);
    this.capabilityHandlers.set(id, handler);
    return this; // For chaining
  }

  public async register(
    registry: string | IAgentRegistry = this.activeRegistry
  ) {
    const registryName =
      typeof registry === 'string' ? registry : registry.name;
    log(`Registering agent with registry: ${registryName}`);
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
      const errorMessage = `Registry not found.`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    try {
      await registry.add(agentInfo);
      log(`Successfully registered with registry: ${registryName}`);
    } catch (error) {
      const errorMessage = `Failed to register with registry '${registryName}': ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async search(
    query: string,
    registry: string | IAgentRegistry = this.activeRegistry
  ): Promise<IAgentRegistryEntry[]> {
    const registryName =
      typeof registry === 'string' ? registry : registry.name;
    log(`Searching for '${query}' in registry: ${registryName}`);

    if (typeof registry === 'string') {
      registry = this.getRegistry(registry);
    }

    if (!registry) {
      const errorMessage = `Registry not found.`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    try {
      const results = await registry.search(query);
      log(`Found ${results.length} results for query '${query}'`);
      return results;
    } catch (error) {
      const errorMessage = `Failed to search for agents with query "${query}" from registry '${registryName}': ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }
  }

  public async publicKey(agentId: string): Promise<string | undefined> {
    log(`Fetching public key for agent: ${agentId}`);
    const agent = await this.activeRegistry.get(agentId);
    if (agent) {
      log(`Public key found for agent: ${agentId}`);
    } else {
      log(`Public key not found for agent: ${agentId}`);
    }
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
    log(
      `Sending task '${capability}' to agent '${toAgentId}' with task ID: ${
        taskId || 'new'
      }`
    );
    const targetAgent = await this.activeRegistry.get(toAgentId);
    if (!targetAgent) {
      const errorMessage = `Agent ${toAgentId} not found in registry.`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }

    if (!targetAgent.endpoint) {
      const errorMessage = `Endpoint for agent ${toAgentId} not configured.`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    log(`Creating task request for capability: ${capability}`);
    const taskRequest = this.agentIdentity.createTaskRequest(
      toAgentId,
      capability,
      params,
      taskId
    );

    try {
      log(`Sending task request to: ${targetAgent.endpoint}/tasks`);
      const response: IAgentMessage = await got
        .post(`${targetAgent.endpoint}/tasks`, {
          json: taskRequest,
        })
        .json();

      log(`Received response for task`);

      if (
        !this.agentIdentity.verifyMessage(response, targetAgent.keys.publicKey)
      ) {
        const errorMessage = 'Response signature verification failed.';
        log(errorMessage);
        throw new AgentError(AgentErrorTypes.INVALID_SIGNATURE, errorMessage);
      }

      log(`Response signature verified`);
      return response.data as ITaskResultData | ITaskErrorData;
    } catch (error) {
      const errorMessage = `Failed to send task to agent ${toAgentId}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }
}
