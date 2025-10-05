import { Agent } from './types';

export class HiveRegistry {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} is already registered.`);
    }
    this.agents.set(agent.id, agent);
  }

  unregister(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with id ${agentId} not found.`);
    }
    this.agents.delete(agentId);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}
