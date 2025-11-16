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

export type IAgentRegistryEntry = AgentCard & { id: string };

export interface IAgentRegistryAdapter {
  name: string;
  add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry>;
  get(agentId: string): Promise<IAgentRegistryEntry | null>;
  search(query: string): Promise<IAgentRegistryEntry[]>;
  list(): Promise<IAgentRegistryEntry[]>;
  remove(agentId: string): Promise<void>;
  update(
    agentId: string,
    agent: Partial<IAgentRegistryEntry>
  ): Promise<IAgentRegistryEntry>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
