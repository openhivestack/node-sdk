import { IAgentConfig } from "./agent-config.interface";

export interface IAgentRegistry {
  add(agent: IAgentConfig): Promise<IAgentConfig>;
  get(agentId: string): Promise<IAgentConfig>;
  search(query: string): Promise<IAgentConfig[]>;
  list(): Promise<IAgentConfig[]>;
  remove(agentId: string): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
  update(agent: IAgentConfig): Promise<void>;
}