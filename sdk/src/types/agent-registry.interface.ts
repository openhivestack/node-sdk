export interface Skill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  input?: Record<string, any>;
  output?: Record<string, any>;
}

export interface AgentCard {
  id?: string; // Optional on creation, will be assigned by the registry
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

export interface AgentRegistry {
  name: string;
  add(agent: AgentCard): Promise<AgentCard>;
  get(agentId: string): Promise<AgentCard | null>;
  search(query: string): Promise<AgentCard[]>;
  list(): Promise<AgentCard[]>;
  delete(agentId: string): Promise<void>;
  update(
    agentId: string,
    agent: Partial<AgentCard>
  ): Promise<AgentCard>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
