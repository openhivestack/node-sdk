import { IAgentRegistry, AgentErrorTypes, IAgentRegistryEntry } from '../types';
import { QueryParser } from '../query/engine';
import { AgentError } from '../agent-error';
import debug from 'debug';

const log = debug('openhive:in-memory-registry');

export class InMemoryRegistry implements IAgentRegistry {
  public name: string;
  public endpoint: string;
  private db: Map<string, IAgentRegistryEntry>;

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint;
    this.db = new Map();
    log(`In-memory registry '${name}' initialized`);
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    log(`Adding agent ${agent.id} to registry '${this.name}'`);
    this.db.set(agent.id, agent);
    return agent;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry> {
    log(`Getting agent ${agentId} from registry '${this.name}'`);
    const agent = this.db.get(agentId);

    if (!agent) {
      const errorMessage = `Agent with id ${agentId} not found`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }

    return agent;
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
          if (filter.operator === 'has_capability') {
            return agent.capabilities.some(
              (c) => c.id.toLowerCase() === filter.value.toLowerCase()
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

  public async clear(): Promise<void> {
    log(`Clearing all agents from registry '${this.name}'`);
    this.db.clear();
  }

  public async close(): Promise<void> {
    log(`Closing registry '${this.name}'`);
    this.db.clear();
  }

  public async update(agent: IAgentRegistryEntry): Promise<void> {
    log(`Updating agent ${agent.id} in registry '${this.name}'`);
    this.db.set(agent.id, agent);
  }
}
