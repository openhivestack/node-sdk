import { IAgentConfig, IAgentRegistry } from './types';
import { QueryParser } from './utils/query-engine';

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

  public async search(query: string): Promise<IAgentConfig[]> {
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
            const agentFieldValue = agent[field as keyof IAgentConfig];
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
          const agentFieldValue = agent[filter.field as keyof IAgentConfig];
          return (
            agentFieldValue &&
            typeof agentFieldValue === 'string' &&
            agentFieldValue.toLowerCase().includes(filter.value.toLowerCase())
          );
        });

      return generalMatch && fieldMatch;
    });
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
