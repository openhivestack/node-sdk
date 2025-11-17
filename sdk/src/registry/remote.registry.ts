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
    const response = await fetch(`${this.endpoint}/agents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(agent),
    });
    if (!response.ok) {
      throw new Error(`Failed to add agent: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard>;
  }

  public async get(agentName: string): Promise<AgentCard | null> {
    log(`Getting agent ${agentName} from remote registry`);
    const response = await fetch(`${this.endpoint}/agents/${agentName}`, {
      headers: this.getHeaders(),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to get agent: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard | null>;
  }

  public async search(query: string): Promise<AgentCard[]> {
    log(`Searching for '${query}' in remote registry`);
    const url = new URL(`${this.endpoint}/agents`);
    url.searchParams.append('q', query);
    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search agents: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard[]>;
  }

  public async list(): Promise<AgentCard[]> {
    log(`Listing agents from remote registry`);
    const response = await fetch(`${this.endpoint}/agents`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard[]>;
  }

  public async delete(agentName: string): Promise<void> {
    log(`Removing agent ${agentName} from remote registry`);
    const response = await fetch(`${this.endpoint}/agents/${agentName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  }

  public async update(
    agentName: string,
    agentUpdate: Partial<AgentCard>
  ): Promise<AgentCard> {
    log(`Updating agent ${agentName} in remote registry`);
    const response = await fetch(`${this.endpoint}/agents/${agentName}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(agentUpdate),
    });
    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard>;
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
