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
  add(agent: AgentCard, ...args: any[]): Promise<AgentCard>;
  get(agentName: string, ...args: any[]): Promise<AgentCard | null>;
  search(query: string, ...args: any[]): Promise<AgentCard[]>;
  list(...args: any[]): Promise<AgentCard[]>;
  delete(agentName: string, ...args: any[]): Promise<void>;
  update(agentName: string, agent: Partial<AgentCard>, ...args: any[]): Promise<AgentCard>;
  clear(...args: any[]): Promise<void>;
  close(...args: any[]): Promise<void>;
}
