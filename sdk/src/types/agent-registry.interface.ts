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

export interface AgentRegistry {
  name: string;
  add(agent: AgentCard): Promise<AgentCard>;
  get(agentName: string): Promise<AgentCard | null>;
  search(query: string): Promise<AgentCard[]>;
  list(): Promise<AgentCard[]>;
  delete(agentName: string): Promise<void>;
  update(agentName: string, agent: Partial<AgentCard>): Promise<AgentCard>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
