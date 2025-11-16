import { IAgentRegistryAdapter, IAgentRegistryEntry } from '../types';
import { QueryParser } from '../query/engine';
import debug from 'debug';
import { randomUUID } from 'crypto';

const log = debug('openhive:in-memory-registry');

export class InMemoryRegistry implements IAgentRegistryAdapter {
  public name: string;
  private db: Map<string, IAgentRegistryEntry>;

  constructor(name: string = 'in-memory') {
    this.name = name;
    this.db = new Map();
    log(`In-memory registry '${name}' initialized`);
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    // Ensure name is unique before adding
    for (const existingAgent of this.db.values()) {
      if (existingAgent.name === agent.name) {
        throw new Error(`Agent with name ${agent.name} already exists.`);
      }
    }

    const agentWithId = { ...agent, id: agent.id || randomUUID() };
    log(`Adding agent ${agentWithId.name} (${agentWithId.id}) to registry '${this.name}'`);
    this.db.set(agentWithId.id, agentWithId);
    return agentWithId;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry | null> {
    log(`Getting agent ${agentId} from registry '${this.name}'`);
    return this.db.get(agentId) || null;
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    log(`Searching for '${query}' in registry '${this.name}'`);
    const parsedQuery = QueryParser.parse(query);
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
          if (filter.operator === 'has_skill') {
            return agent.skills.some(
              (s) => s.id.toLowerCase() === filter.value.toLowerCase() || s.name.toLowerCase() === filter.value.toLowerCase()
            );
          }
          const agentFieldValue =
            agent[filter.field as keyof IAgentRegistryEntry];
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

  public async list(): Promise<IAgentRegistryEntry[]> {
    log(`Listing all agents in registry '${this.name}'`);
    return Array.from(this.db.values());
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from registry '${this.name}'`);
    this.db.delete(agentId);
  }

  public async update(agentId: string, agentUpdate: Partial<IAgentRegistryEntry>): Promise<IAgentRegistryEntry> {
    log(`Updating agent ${agentId} in registry '${this.name}'`);
    const existingAgent = this.db.get(agentId);
    if (!existingAgent) {
      throw new Error(`Agent with ID ${agentId} not found.`);
    }
    const updatedAgent = { ...existingAgent, ...agentUpdate };
    this.db.set(agentId, updatedAgent);
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
