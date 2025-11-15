import { AgentCard } from '@a2a-js/sdk';

export type IAgentRegistryEntry = AgentCard;

export interface IAgentRegistryAdapter {
  name: string;
  add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry>;
  get(agentId: string): Promise<IAgentRegistryEntry | null>;
  search(query: string): Promise<IAgentRegistryEntry[]>;
  list(): Promise<IAgentRegistryEntry[]>;
  remove(agentId: string): Promise<void>;
  update(agentId: string, agent: Partial<IAgentRegistryEntry>): Promise<IAgentRegistryEntry>;
  clear(): Promise<void>;
  close(): Promise<void>;
}