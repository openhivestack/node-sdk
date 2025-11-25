import { AgentRegistry } from './types';
import { AgentCard } from './types/agent-registry.interface';
import { InMemoryRegistry } from './registry/in-memory.registry';
import { RemoteRegistry } from './registry/remote.registry';
import { QueryParser } from './query/engine';

export interface OpenHiveOptions<T = AgentCard> {
  registryUrl?: string;
  headers?: Record<string, string>;
  apiKey?: string;
  accessToken?: string;
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
        apiKey: options.apiKey,
        accessToken: options.accessToken,
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

  public async list(
    options?: { page?: number; limit?: number },
    ...args: any[]
  ): Promise<T[]> {
    return this._registry.list(options, ...args);
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

  public async search(
    query: string,
    options?: { page?: number; limit?: number },
    ...args: any[]
  ): Promise<T[]> {
    return this._registry.search(query, options, ...args);
  }

  public async close(...args: any[]): Promise<void> {
    return this._registry.close(...args);
  }

  // Extended Platform Methods
  public async completeUpload(agent: any): Promise<any> {
    if (this._registry.completeUpload) {
      return this._registry.completeUpload(agent);
    }
    throw new Error('Registry does not support completeUpload');
  }

  public async deployAgent(agentName: string): Promise<any> {
    if (this._registry.deployAgent) {
      return this._registry.deployAgent(agentName);
    }
    throw new Error('Registry does not support deployAgent');
  }

  public async getAgentDownload(agentName: string, versionOrTag = 'latest'): Promise<any> {
    if (this._registry.getAgentDownload) {
      return this._registry.getAgentDownload(agentName, versionOrTag);
    }
    throw new Error('Registry does not support getAgentDownload');
  }

  public async getCurrentUser(): Promise<any> {
    if (this._registry.getCurrentUser) {
      return this._registry.getCurrentUser();
    }
    throw new Error('Registry does not support getCurrentUser');
  }

  public async requestUploadUrl(agent: any, force: boolean): Promise<any> {
    if (this._registry.requestUploadUrl) {
      return this._registry.requestUploadUrl(agent, force);
    }
    throw new Error('Registry does not support requestUploadUrl');
  }

  public async revokeApiKey(token: string): Promise<void> {
    if (this._registry.revokeApiKey) {
      return this._registry.revokeApiKey(token);
    }
    throw new Error('Registry does not support revokeApiKey');
  }
}
