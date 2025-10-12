import { IAgentConfig } from "./agent-config.interface";

export type IAgentRegistryEntry = Omit<IAgentConfig, 'keys'> & { keys: { publicKey: string } };

export interface IAgentRegistry {
  name: string;
  endpoint: string;
  add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry>;
  get(agentId: string): Promise<IAgentRegistryEntry>;
  search(query: string): Promise<IAgentRegistryEntry[]>;
  list(): Promise<IAgentRegistryEntry[]>;
  remove(agentId: string): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
  update(agent: IAgentRegistryEntry): Promise<void>;
}