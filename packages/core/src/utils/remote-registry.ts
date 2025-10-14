import got from 'got';
import { AgentError } from './agent-error';
import { IAgentRegistry, IAgentRegistryEntry, AgentErrorTypes } from '../types';

export class RemoteRegistry implements IAgentRegistry {
  public name: string;
  public endpoint: string;

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint;
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    try {
      return await got
        .post(`${this.endpoint}/registry/add`, {
          json: agent,
        })
        .json<IAgentRegistryEntry>();
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to register with remote registry at ${this.endpoint}: ${error}`
      );
    }
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry> {
    try {
      const url = new URL(`${this.endpoint}/registry/${agentId}`);
      return await got.get(url.toString()).json<IAgentRegistryEntry>();
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.AGENT_NOT_FOUND,
        `Failed to get agent ${agentId} from registry at ${this.endpoint}: ${error}`
      );
    }
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    try {
      const url = new URL(`${this.endpoint}/registry/search`);
      url.searchParams.append('q', query);
      return await got.get(url.toString()).json<IAgentRegistryEntry[]>();
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to search for agents with query "${query}" from registry at ${this.endpoint}: ${error}`
      );
    }
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
    try {
      const url = new URL(`${this.endpoint}/registry/list`);
      return await got.get(url.toString()).json<IAgentRegistryEntry[]>();
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to list agents from registry at ${this.endpoint}: ${error}`
      );
    }
  }

  public async remove(agentId: string): Promise<void> {
    try {
      await got.delete(`${this.endpoint}/registry/remove/${agentId}`);
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to remove agent ${agentId} from registry at ${this.endpoint}: ${error}`
      );
    }
  }

  public async clear(): Promise<void> {
    throw new Error('Clear operation is not supported on a remote registry.');
  }

  public async close(): Promise<void> {
    // No-op for remote registry
    return Promise.resolve();
  }

  public async update(agent: IAgentRegistryEntry): Promise<void> {
    try {
      await got.put(`${this.endpoint}/registry/${agent.id}`, {
        json: agent,
      });
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.PROCESSING_FAILED,
        `Failed to update agent ${agent.id} in registry at ${this.endpoint}: ${error}`
      );
    }
  }
}
