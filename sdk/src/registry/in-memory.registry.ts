import { AgentRegistry, AgentCard } from '../types';
import { QueryParser } from '../query/engine';
import debug from 'debug';

const log = debug('openhive:in-memory-registry');

export class InMemoryRegistry implements AgentRegistry {
  public name: string;
  private db: Map<string, AgentCard>;
  private queryParser: QueryParser;

  constructor(name = 'in-memory', queryParser?: QueryParser) {
    this.name = name;
    this.db = new Map();
    this.queryParser = queryParser || new QueryParser();
    log(`In-memory registry '${name}' initialized`);
  }

  public async add(agent: AgentCard): Promise<AgentCard> {
    // Ensure name is unique before adding
    for (const existingAgent of this.db.values()) {
      if (existingAgent.name === agent.name) {
        throw new Error(`Agent with name ${agent.name} already exists.`);
      }
    }

    log(`Adding agent ${agent.name} to registry '${this.name}'`);
    this.db.set(agent.name, agent);
    return agent;
  }

  public async get(agentName: string): Promise<AgentCard | null> {
    log(`Getting agent ${agentName} from registry '${this.name}'`);
    const agent = this.db.get(agentName);
    return agent ? { ...agent } : null;
  }

  public async search(query: string): Promise<AgentCard[]> {
    log(`Searching for '${query}' in registry '${this.name}'`);
    const parsedQuery = this.queryParser.parse(query);
    const agents = Array.from(this.db.values());

    if (!query || query.trim() === '') {
      log('Empty query, returning all agents');
      return agents;
    }

    const results = agents.filter((agent) => {
      const generalMatch =
        !parsedQuery.generalFilters.length ||
        parsedQuery.generalFilters.every((filter) => {
          return filter.fields.some((field) => {
            const agentFieldValue = agent[field as keyof AgentCard];
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
          if (filter.operator === 'has_skill') {
            return agent.skills.some(
              (s) =>
                s.id.toLowerCase() === filter.value.toLowerCase() ||
                s.name.toLowerCase() === filter.value.toLowerCase()
            );
          }
          const agentFieldValue = agent[filter.field as keyof AgentCard];
          return (
            agentFieldValue &&
            typeof agentFieldValue === 'string' &&
            agentFieldValue.toLowerCase().includes(filter.value.toLowerCase())
          );
        });

      return generalMatch && fieldMatch;
    });

    log(`Search for '${query}' returned ${results.length} results`);
    return results;
  }

  public async list(): Promise<AgentCard[]> {
    log(`Listing all agents in registry '${this.name}'`);
    return Array.from(this.db.values());
  }

  public async delete(agentName: string): Promise<void> {
    log(`Removing agent ${agentName} from registry '${this.name}'`);
    this.db.delete(agentName);
  }

  public async update(
    agentName: string,
    agentUpdate: Partial<AgentCard>
  ): Promise<AgentCard> {
    log(`Updating agent ${agentName} in registry '${this.name}'`);
    const existingAgent = this.db.get(agentName);
    if (!existingAgent) {
      throw new Error(`Agent with name ${agentName} not found.`);
    }
    const updatedAgent = { ...existingAgent, ...agentUpdate };
    this.db.set(agentName, updatedAgent);
    return updatedAgent;
  }

  public async clear(): Promise<void> {
    log(`Clearing all agents from registry '${this.name}'`);
    this.db.clear();
  }

  public async close(): Promise<void> {
    log(`Closing registry '${this.name}'`);
    this.db.clear();
  }
}
