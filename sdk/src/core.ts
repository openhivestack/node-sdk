import { AgentRegistry } from './types';
import { AgentCard } from './types/agent-registry.interface';
import { InMemoryRegistry } from './registry/in-memory.registry';
import { RemoteRegistry } from './registry/remote.registry';
import { QueryParser } from './query/engine';

export interface OpenHiveOptions {
  registryUrl?: string;
  headers?: Record<string, string>;
  queryParser?: QueryParser;
  registry?: AgentRegistry;
}

export class OpenHive {
  private _registry: AgentRegistry;

  constructor(options: OpenHiveOptions = {}) {
    if (options.registry) {
      this._registry = options.registry;
    } else if (options.registryUrl) {
      const headers: Record<string, string> = options.headers || {};
      this._registry = new RemoteRegistry(options.registryUrl, { headers });
    } else {
      this._registry = new InMemoryRegistry('in-memory', options.queryParser);
    }
  }

  public async add(agent: AgentCard, ...args: any[]): Promise<AgentCard> {
    return this._registry.add(agent, ...args);
  }

  public async get(
    agentName: string,
    ...args: any[]
  ): Promise<AgentCard | null> {
    return this._registry.get(agentName, ...args);
  }

  public async list(...args: any[]): Promise<AgentCard[]> {
    return this._registry.list(...args);
  }

  public async update(
    agentName: string,
    agent: Partial<AgentCard>,
    ...args: any[]
  ): Promise<AgentCard> {
    return this._registry.update(agentName, agent, ...args);
  }

  public async delete(agentName: string, ...args: any[]): Promise<void> {
    return this._registry.delete(agentName, ...args);
  }

  public async search(query: string, ...args: any[]): Promise<AgentCard[]> {
    return this._registry.search(query, ...args);
  }

  public async close(...args: any[]): Promise<void> {
    return this._registry.close(...args);
  }
}
