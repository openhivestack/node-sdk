export interface Skill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  input?: Record<string, any>;
  output?: Record<string, any>;
}

export interface AgentCard {
  name: string;
  description?: string;
  protocolVersion: string;
  version: string;
  url: string;
  skills: Skill[];
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
}

export interface AgentRegistry<T = AgentCard> {
  name: string;
  add(agent: AgentCard, ...args: any[]): Promise<T>;
  get(agentName: string, ...args: any[]): Promise<T | null>;
  search(query: string, ...args: any[]): Promise<T[]>;
  list(...args: any[]): Promise<T[]>;
  delete(agentName: string, ...args: any[]): Promise<void>;
  update(
    agentName: string,
    agent: Partial<AgentCard>,
    ...args: any[]
  ): Promise<T>;
  clear(...args: any[]): Promise<void>;
  close(...args: any[]): Promise<void>;

  // Optional extended methods for platform-specific features
  // Using optional methods allows the interface to remain compatible with simple registries
  // while supporting advanced features in RemoteRegistry.
  completeUpload?(agent: any): Promise<any>;
  deployAgent?(agentName: string): Promise<any>;
  getAgentDownload?(agentName: string, versionOrTag?: string): Promise<any>;
  getCurrentUser?(): Promise<any>;
  requestUploadUrl?(agent: any, force: boolean): Promise<any>;
  revokeApiKey?(token: string): Promise<void>;
}
