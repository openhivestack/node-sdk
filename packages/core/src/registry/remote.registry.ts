import got from 'got';
import { AgentError } from '../agent-error';
import { IAgentRegistry, IAgentRegistryEntry, AgentErrorTypes } from '../types';
import debug from 'debug';

const log = debug('openhive:remote-registry');

export class RemoteRegistry implements IAgentRegistry {
  public name: string;
  public endpoint: string;
  private token?: string;

  constructor(name: string, endpoint: string, token?: string) {
    this.name = name;
    this.endpoint = endpoint;
    this.token = token;
    log(`Remote registry '${name}' initialized for endpoint: ${endpoint}`);
  }

  private getHeaders(): Record<string, string> {
    if (this.token) {
      return {
        Authorization: `Bearer ${this.token}`,
      };
    }
    return {};
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    log(`Adding agent ${agent.id} to remote registry '${this.name}'`);
    try {
      return await got
        .post(`${this.endpoint}/registry/agents/add`, {
          json: agent,
          headers: this.getHeaders(),
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
      const url = new URL(`${this.endpoint}/registry/agents/${agentId}`);
      return await got
        .get(url.toString(), {
          headers: this.getHeaders(),
        })
        .json<IAgentRegistryEntry>();
    } catch (error) {
      const errorMessage = `Failed to get agent ${agentId} from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    log(`Searching for '${query}' in remote registry '${this.name}'`);
    try {
      const url = new URL(`${this.endpoint}/registry/agents/search`);
      url.searchParams.append('q', query);
      return await got
        .get(url.toString(), { headers: this.getHeaders() })
        .json<IAgentRegistryEntry[]>();
    } catch (error) {
      const errorMessage = `Failed to search for agents with query "${query}" from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
    log(`Listing agents from remote registry '${this.name}'`);
    try {
      const url = new URL(`${this.endpoint}/registry/agents/list`);
      return await got
        .get(url.toString(), { headers: this.getHeaders() })
        .json<IAgentRegistryEntry[]>();
    } catch (error) {
      const errorMessage = `Failed to list agents from registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from remote registry '${this.name}'`);
    try {
      await got.delete(`${this.endpoint}/registry/agents/${agentId}`, {
        headers: this.getHeaders(),
      });
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
      await got.put(`${this.endpoint}/registry/agents/${agent.id}`, {
        json: agent,
        headers: this.getHeaders(),
      });
    } catch (error) {
      const errorMessage = `Failed to update agent ${agent.id} in registry at ${this.endpoint}: ${error}`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }
}
