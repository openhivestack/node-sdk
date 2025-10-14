import got from 'got';
import { AgentError } from './agent-error';
import { IAgentRegistry, IAgentRegistryEntry, AgentErrorTypes } from '../types';
import debug from 'debug';

const log = debug('openhive:remote-registry');

export class RemoteRegistry implements IAgentRegistry {
  public name: string;
  public endpoint: string;

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint;
    log(`Remote registry '${name}' initialized for endpoint: ${endpoint}`);
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    log(`Adding agent ${agent.id} to remote registry '${this.name}'`);
    try {
      return await got
        .post(`${this.endpoint}/registry/add`, {
          json: agent,
        })
        .json<IAgentRegistryEntry>();
    } catch (error) {
      const errorMessage = `Failed to register with remote registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry> {
    log(`Getting agent ${agentId} from remote registry '${this.name}'`);
    try {
      const url = new URL(`${this.endpoint}/registry/${agentId}`);
      return await got.get(url.toString()).json<IAgentRegistryEntry>();
    } catch (error) {
      const errorMessage = `Failed to get agent ${agentId} from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    log(`Searching for '${query}' in remote registry '${this.name}'`);
    try {
      const url = new URL(`${this.endpoint}/registry/search`);
      url.searchParams.append('q', query);
      return await got.get(url.toString()).json<IAgentRegistryEntry[]>();
    } catch (error) {
      const errorMessage = `Failed to search for agents with query "${query}" from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
    log(`Listing agents from remote registry '${this.name}'`);
    try {
      const url = new URL(`${this.endpoint}/registry/list`);
      return await got.get(url.toString()).json<IAgentRegistryEntry[]>();
    } catch (error) {
      const errorMessage = `Failed to list agents from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from remote registry '${this.name}'`);
    try {
      await got.delete(`${this.endpoint}/registry/remove/${agentId}`);
    } catch (error) {
      const errorMessage = `Failed to remove agent ${agentId} from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async clear(): Promise<void> {
    log(`Clear operation is not supported on a remote registry.`);
    throw new Error('Clear operation is not supported on a remote registry.');
  }

  public async close(): Promise<void> {
    log(`No-op for remote registry '${this.name}' close`);
    // No-op for remote registry
    return Promise.resolve();
  }

  public async update(agent: IAgentRegistryEntry): Promise<void> {
    log(`Updating agent ${agent.id} in remote registry '${this.name}'`);
    try {
      await got.put(`${this.endpoint}/registry/${agent.id}`, {
        json: agent,
      });
    } catch (error) {
      const errorMessage = `Failed to update agent ${agent.id} in registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }
}
