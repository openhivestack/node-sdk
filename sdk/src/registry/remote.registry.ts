import { AgentRegistry, AgentCard } from '../types';
import debug from 'debug';

const log = debug('openhive:remote-registry');

export interface RemoteRegistryOptions {
  headers?: Record<string, string>;
}

export class RemoteRegistry implements AgentRegistry {
  public name: string;
  public endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string, options?: RemoteRegistryOptions) {
    this.name = 'remote';
    this.endpoint = endpoint;
    this.headers = options?.headers || {};
    log(`Remote registry adapter initialized for endpoint: ${endpoint}`);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
    };
    return headers;
  }

  public async add(agent: AgentCard, ...args: any[]): Promise<AgentCard> {
    log(`Adding agent ${agent.name} to remote registry`);
    const response = await fetch(`${this.endpoint}/agent`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(agent),
    });
    if (!response.ok) {
      throw new Error(`Failed to add agent: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard>;
  }

  public async get(agentName: string, ...args: any[]): Promise<AgentCard | null> {
    log(`Getting agent ${agentName} from remote registry`);
    const response = await fetch(`${this.endpoint}/agent/${agentName}`, {
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

  public async search(query: string, ...args: any[]): Promise<AgentCard[]> {
    log(`Searching for '${query}' in remote registry`);
    const url = new URL(`${this.endpoint}/agent`);
    url.searchParams.append('q', query);
    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search agents: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard[]>;
  }

  public async list(...args: any[]): Promise<AgentCard[]> {
    log(`Listing agents from remote registry`);
    const response = await fetch(`${this.endpoint}/agent`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard[]>;
  }

  public async delete(agentName: string, ...args: any[]): Promise<void> {
    log(`Removing agent ${agentName} from remote registry`);
    const response = await fetch(`${this.endpoint}/agent/${agentName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  }

  public async update(
    agentName: string,
    agentUpdate: Partial<AgentCard>,
    ...args: any[]
  ): Promise<AgentCard> {
    log(`Updating agent ${agentName} in remote registry`);
    const response = await fetch(`${this.endpoint}/agent/${agentName}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(agentUpdate),
    });
    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`);
    }
    return response.json() as Promise<AgentCard>;
  }

  public async clear(...args: any[]): Promise<void> {
    log(`Clear operation is not supported on a remote registry.`);
    throw new Error('Clear operation is not supported on a remote registry.');
  }

  public async close(...args: any[]): Promise<void> {
    log(`No-op for remote registry close`);
    return Promise.resolve();
  }
}
