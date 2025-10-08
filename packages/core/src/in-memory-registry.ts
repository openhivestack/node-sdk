import { IAgentConfig, IAgentRegistry } from "./types";

export class InMemoryRegistry implements IAgentRegistry {
  private db: Map<string, IAgentConfig>;

  constructor() {
    this.db = new Map();
  }

  public async add(agent: IAgentConfig): Promise<IAgentConfig> {
    this.db.set(agent.id, agent);
    return agent;
  }

  public async get(agentId: string): Promise<IAgentConfig> {
    const agent = this.db.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }
    
    return agent;
  }

  public async list(): Promise<IAgentConfig[]> {
    return Array.from(this.db.values());
  }

  public async remove(agentId: string): Promise<void> {
    this.db.delete(agentId);
  }

  public async clear(): Promise<void> {
    this.db.clear();
  }

  public async close(): Promise<void> {
    this.db.clear();
  }

  public async update(agent: IAgentConfig): Promise<void> {
    this.db.set(agent.id, agent);
  }
}