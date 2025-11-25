import { AgentRegistry, AgentCard } from '../types';
import debug from 'debug';

const log = debug('openhive:remote-registry');

export interface RemoteRegistryOptions {
  headers?: Record<string, string>;
  apiKey?: string;
  accessToken?: string;
}

export class RemoteRegistry implements AgentRegistry {
  public name: string;
  public endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string, options?: RemoteRegistryOptions) {
    this.name = 'remote';
    this.endpoint = endpoint;
    this.headers = options?.headers || {};

    if (options?.apiKey) {
      this.headers['x-api-key'] = options.apiKey;
    }

    if (options?.accessToken) {
      this.headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

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

  public async get(
    agentName: string,
    ...args: any[]
  ): Promise<AgentCard | null> {
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

    const options = args[0] as { page?: number; limit?: number } | undefined;
    if (options?.page) url.searchParams.append('page', options.page.toString());
    if (options?.limit)
      url.searchParams.append('limit', options.limit.toString());

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
    const url = new URL(`${this.endpoint}/agent`);

    const options = args[0] as { page?: number; limit?: number } | undefined;
    if (options?.page) url.searchParams.append('page', options.page.toString());
    if (options?.limit)
      url.searchParams.append('limit', options.limit.toString());

    const response = await fetch(url.toString(), {
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

  public async completeUpload(agent: any): Promise<any> {
    log(`Completing upload for agent ${agent.name}`);
    const response = await fetch(`${this.endpoint}/agent/publish-complete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ agent }),
    });

    const responseData: any = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to complete upload: ${response.statusText}`);
    }
    return responseData;
  }

  public async deployAgent(agentName: string): Promise<any> {
    log(`Triggering deployment for agent ${agentName}`);
    const response = await fetch(`${this.endpoint}/agent/${agentName}/deploy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    });

    let responseData: any;
    try {
      responseData = await response.json();
    } catch (error) {
       // Handle potentially non-JSON error responses or empty bodies gracefully if needed,
       // though typical API errors should be JSON.
       const text = await response.text();
       throw new Error(`Server returned invalid JSON: ${text}`);
    }

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || response.statusText);
    }
    return responseData;
  }

  public async getAgentDownload(agentName: string, versionOrTag = 'latest'): Promise<any> {
    log(`Getting download URL for agent ${agentName} version ${versionOrTag}`);
    const url = new URL(`${this.endpoint}/agent/${agentName}/download-url`);
    url.searchParams.append('versionOrTag', versionOrTag);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    const responseData: any = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to get download URL: ${response.statusText}`);
    }
    if (!responseData.url) {
      throw new Error('No response data received from platform');
    }
    return responseData;
  }

  public async getCurrentUser(): Promise<any> {
    log(`Getting current user info`);
    const response = await fetch(`${this.endpoint}/users/me`, {
      headers: this.getHeaders(),
    });

    const responseData: any = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to get user info: ${response.statusText}`);
    }
    if (!responseData.user) {
       throw new Error('Invalid token or user not found');
    }
    return responseData.user;
  }

  public async requestUploadUrl(agent: any, force: boolean): Promise<any> {
    log(`Requesting upload URL for agent ${agent.name}`);
    const response = await fetch(`${this.endpoint}/agent/${agent.name}/upload-url`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ agent, force }),
    });

    const responseData: any = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to request upload URL: ${response.statusText}`);
    }
    if (!responseData.url) {
      throw new Error('No response data received from platform');
    }
    return responseData;
  }

  public async revokeApiKey(token: string): Promise<void> {
     log(`Revoking API key`);
     // Note: The CLI implementation sends the token in the Authorization header specifically for this request
     // We need to ensure we use the passed token or the client's configured token.
     // The CLI implementation passed `token` as an argument.
     // Here, we can assume `this.headers` already contains the correct auth if configured, 
     // OR we might need to override it if a specific token is passed to revoke (though usually you revoke your own).
     
     // Ideally, we should respect the `token` argument if provided, but for now let's assume we use the client's auth.
     // If `token` is passed, we can override the header.
     
     const headers = this.getHeaders();
     if (token) {
         headers['Authorization'] = `Bearer ${token}`;
     }

     const response = await fetch(`${this.endpoint}/auth/sign-out`, {
        method: 'POST',
        headers: headers,
     });
     
     if (!response.ok) {
         // CLI just logs warning, here we throw or just log?
         // Let's throw to let caller handle it.
         const errorBody: any = await response.json().catch(() => ({}));
         throw new Error(errorBody.message || `Failed to revoke token: ${response.statusText}`);
     }
  }
}
