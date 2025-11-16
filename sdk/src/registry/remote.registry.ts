import got from 'got';
import { AgentRegistry, AgentCard } from '../types';
import debug from 'debug';

const log = debug('openhive:remote-registry');

export class RemoteRegistry implements AgentRegistry {
  public name: string;
  public endpoint: string;
  private token?: string;

  constructor(endpoint: string, token?: string) {
    this.name = 'remote';
    this.endpoint = endpoint;
    this.token = token;
    log(`Remote registry adapter initialized for endpoint: ${endpoint}`);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  public async add(agent: AgentCard): Promise<AgentCard> {
    log(`Adding agent ${agent.name} to remote registry`);
    return await got
      .post(`${this.endpoint}/agents`, {
        json: agent,
        headers: this.getHeaders(),
      })
      .json<AgentCard>();
  }

  public async get(agentId: string): Promise<AgentCard | null> {
    log(`Getting agent ${agentId} from remote registry`);
    try {
      return await got
        .get(`${this.endpoint}/agents/${agentId}`, {
          headers: this.getHeaders(),
        })
        .json<AgentCard>();
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async search(query: string): Promise<AgentCard[]> {
    log(`Searching for '${query}' in remote registry`);
    const url = new URL(`${this.endpoint}/agents`);
    url.searchParams.append('q', query);
    return await got
      .get(url.toString(), { headers: this.getHeaders() })
      .json<AgentCard[]>();
  }

  public async list(): Promise<AgentCard[]> {
    log(`Listing agents from remote registry`);
    return await got
      .get(`${this.endpoint}/agents`, { headers: this.getHeaders() })
      .json<AgentCard[]>();
  }

  public async delete(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from remote registry`);
    await got.delete(`${this.endpoint}/agents/${agentId}`, {
      headers: this.getHeaders(),
    });
  }

  public async update(
    agentId: string,
    agentUpdate: Partial<AgentCard>
  ): Promise<AgentCard> {
    log(`Updating agent ${agentId} in remote registry`);
    return await got
      .put(`${this.endpoint}/agents/${agentId}`, {
        json: agentUpdate,
        headers: this.getHeaders(),
      })
      .json<AgentCard>();
  }

  public async clear(): Promise<void> {
    log(`Clear operation is not supported on a remote registry.`);
    throw new Error('Clear operation is not supported on a remote registry.');
  }

  public async close(): Promise<void> {
    log(`No-op for remote registry close`);
    return Promise.resolve();
  }
}
