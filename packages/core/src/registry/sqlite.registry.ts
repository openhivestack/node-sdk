import { IAgentRegistry, AgentErrorTypes, IAgentRegistryEntry } from '../types';
import { QueryParser } from '../query/engine';
import { AgentError } from '../agent-error';
import debug from 'debug';
import Database from 'better-sqlite3';

const log = debug('openhive:sqlite-registry');

export class SqliteRegistry implements IAgentRegistry {
  public name: string;
  public endpoint: string;
  private db: Database.Database;

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint; // in this context, endpoint is the file path
    this.db = new Database(this.endpoint);
    this.init();
    log(`SQLite registry '${name}' initialized at ${this.endpoint}`);
  }

  private init(): void {
    const createTable = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        endpoint TEXT,
        capabilities TEXT,
        description TEXT,
        version TEXT,
        host TEXT,
        port INTEGER,
        runtime TEXT,
        private INTEGER,
        logLevel TEXT,
        env TEXT,
        publicKey TEXT
      )
    `);
    createTable.run();
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    log(`Adding agent ${agent.id} to registry '${this.name}'`);
    const stmt = this.db.prepare(
      'INSERT INTO agents (id, name, endpoint, capabilities, description, version, host, port, runtime, private, logLevel, env, publicKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      agent.id,
      agent.name,
      agent.endpoint,
      JSON.stringify(agent.capabilities),
      agent.description,
      agent.version,
      agent.host,
      agent.port,
      agent.runtime,
      agent.private ? 1 : 0,
      agent.logLevel,
      agent.env,
      agent.keys.publicKey
    );
    return agent;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry> {
    log(`Getting agent ${agentId} from registry '${this.name}'`);
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const agentData = stmt.get(agentId) as any;

    if (!agentData) {
      const errorMessage = `Agent with id ${agentId} not found`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.AGENT_NOT_FOUND, errorMessage);
    }

    return this.toAgentRegistryEntry(agentData);
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    log(`Searching for '${query}' in registry '${this.name}'`);
    // NOTE: This is a naive implementation that fetches all agents and filters in memory.
    // For large datasets, this should be optimized to use SQL queries.
    const agents = await this.list();
    if (!query || query.trim() === '') {
      log('Empty query, returning all agents');
      return agents;
    }

    const parsedQuery = QueryParser.parse(query);

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

          if (
            filter.field === 'private' &&
            typeof agentFieldValue === 'boolean'
          ) {
            return agentFieldValue === (filter.value === 'true');
          }

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
    const stmt = this.db.prepare('SELECT * FROM agents');
    const agentsData = stmt.all() as any[];
    return agentsData.map((agentData) => this.toAgentRegistryEntry(agentData));
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from registry '${this.name}'`);
    const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
    stmt.run(agentId);
  }

  public async clear(): Promise<void> {
    log(`Clearing all agents from registry '${this.name}'`);
    this.db.prepare('DELETE FROM agents').run();
  }

  public async close(): Promise<void> {
    log(`Closing registry '${this.name}'`);
    this.db.close();
  }

  public async update(agent: IAgentRegistryEntry): Promise<void> {
    log(`Updating agent ${agent.id} in registry '${this.name}'`);
    const stmt = this.db.prepare(
      'UPDATE agents SET name = ?, endpoint = ?, capabilities = ?, description = ?, version = ?, host = ?, port = ?, runtime = ?, private = ?, logLevel = ?, env = ?, publicKey = ? WHERE id = ?'
    );
    stmt.run(
      agent.name,
      agent.endpoint,
      JSON.stringify(agent.capabilities),
      agent.description,
      agent.version,
      agent.host,
      agent.port,
      agent.runtime,
      agent.private ? 1 : 0,
      agent.logLevel,
      agent.env,
      agent.keys.publicKey,
      agent.id
    );
  }

  private toAgentRegistryEntry(agentData: any): IAgentRegistryEntry {
    return {
      id: agentData.id,
      name: agentData.name,
      endpoint: agentData.endpoint,
      capabilities: JSON.parse(agentData.capabilities),
      description: agentData.description,
      version: agentData.version,
      host: agentData.host,
      port: agentData.port,
      runtime: agentData.runtime,
      private: agentData.private === 1,
      logLevel: agentData.logLevel,
      env: agentData.env,
      keys: {
        publicKey: agentData.publicKey,
      },
    };
  }
}
