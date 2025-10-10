import { IAgentRegistry, AgentErrorTypes, IAgentRegistryEntry } from '../types';
import { QueryParser } from './query-engine';
import { AgentError } from './agent-error';

export class InMemoryRegistry implements IAgentRegistry {
  private db: Map<string, IAgentRegistryEntry>;

  constructor() {
    this.db = new Map();
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    this.db.set(agent.id, agent);
    return agent;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry> {
    const agent = this.db.get(agentId);

    if (!agent) {
      throw new AgentError(
        AgentErrorTypes.AGENT_NOT_FOUND,
        `Agent with id ${agentId} not found`
      );
    }

    return agent;
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    const parsedQuery = QueryParser.parse(query);
    const agents = Array.from(this.db.values());

    if (!query || query.trim() === '') {
      return agents;
    }

    return agents.filter((agent) => {
      const generalMatch =
        !parsedQuery.generalFilters.length ||
        parsedQuery.generalFilters.every((filter) => {
          return filter.fields.some((field) => {
            const agentFieldValue = agent[field as keyof IAgentRegistryEntry];
            return (
              agentFieldValue &&
              typeof agentFieldValue === 'string' &&
              agentFieldValue.toLowerCase().includes(filter.term.toLowerCase())
            );
          });
        });

      const fieldMatch =
        !parsedQuery.fieldFilters.length ||
        parsedQuery.fieldFilters.every((filter) => {
          if (filter.operator === 'has_capability') {
            return agent.capabilities.some(
              (c) => c.id.toLowerCase() === filter.value.toLowerCase()
            );
          }
          const agentFieldValue = agent[filter.field as keyof IAgentRegistryEntry];
          return (
            agentFieldValue &&
            typeof agentFieldValue === 'string' &&
            agentFieldValue.toLowerCase().includes(filter.value.toLowerCase())
          );
        });

      return generalMatch && fieldMatch;
    });
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
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

  public async update(agent: IAgentRegistryEntry): Promise<void> {
    this.db.set(agent.id, agent);
  }
}
