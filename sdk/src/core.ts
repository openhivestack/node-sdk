import { AgentRegistry } from './types';
import { AgentCard } from './types/agent-registry.interface';
import { InMemoryRegistry } from './registry/in-memory.registry';
import { RemoteRegistry } from './registry/remote.registry';
import { QueryParser } from './query/engine';

export interface OpenHiveOptions<T = AgentCard> {
  registryUrl?: string;
  headers?: Record<string, string>;
  queryParser?: QueryParser;
  registry?: AgentRegistry<T>;
}

export class OpenHive<T = AgentCard> {
  private _registry: AgentRegistry<T>;

  constructor(options: OpenHiveOptions<T> = {}) {
    if (options.registry) {
      this._registry = options.registry;
    } else if (options.registryUrl) {
      const headers: Record<string, string> = options.headers || {};
      // RemoteRegistry implements AgentRegistry<AgentCard>, so we might need a cast if T is different
      // But default behavior is AgentCard.
      this._registry = new RemoteRegistry(options.registryUrl, {
        headers,
      }) as unknown as AgentRegistry<T>;
    } else {
      this._registry = new InMemoryRegistry(
        'in-memory',
        options.queryParser
      ) as unknown as AgentRegistry<T>;
    }
  }

  public async add(agent: AgentCard, ...args: any[]): Promise<T> {
    return this._registry.add(agent, ...args);
  }

  public async get(agentName: string, ...args: any[]): Promise<T | null> {
    return this._registry.get(agentName, ...args);
  }

  public async list(...args: any[]): Promise<T[]> {
    return this._registry.list(...args);
  }

  public async update(
    agentName: string,
    agent: Partial<AgentCard>,
    ...args: any[]
  ): Promise<T> {
    return this._registry.update(agentName, agent, ...args);
  }

  public async delete(agentName: string, ...args: any[]): Promise<void> {
    return this._registry.delete(agentName, ...args);
  }

  public async search(query: string, ...args: any[]): Promise<T[]> {
    return this._registry.search(query, ...args);
  }

  public async close(...args: any[]): Promise<void> {
    return this._registry.close(...args);
  }
}
