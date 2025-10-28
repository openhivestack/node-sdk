import { IAgentConfig } from "./agent-config.interface";

export type IAgentRegistryEntry = Omit<IAgentConfig, 'keys'> & { keys: { publicKey: string } };

export interface IAgentRegistry {
  name: string;
  endpoint: string;
  add(agent: IAgentRegistryEntry, ...args: any[]): Promise<IAgentRegistryEntry>;
  get(agentId: string, ...args: any[]): Promise<IAgentRegistryEntry>;
  search(query: string, ...args: any[]): Promise<IAgentRegistryEntry[]>;
  list(...args: any[]): Promise<IAgentRegistryEntry[]>;
  remove(agentId: string, ...args: any[]): Promise<void>;
  clear(...args: any[]): Promise<void>;
  close(...args: any[]): Promise<void>;
  update(agent: IAgentRegistryEntry, ...args: any[]): Promise<void>;
}