import Database from 'better-sqlite3';
import { IAgentRegistryAdapter, IAgentRegistryEntry } from '../types';
import debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import { QueryParser } from '../query/engine';
import { randomUUID } from 'crypto';

const log = debug('openhive:sqlite-registry');

export class SqliteRegistry implements IAgentRegistryAdapter {
  public name: string;
  private db: Database.Database;

  constructor(dbPath: string) {
    this.name = 'sqlite';

    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    log(`SQLite registry initialized at ${dbPath}`);
    this.createTable();
  }

  private createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        protocolVersion TEXT,
        version TEXT,
        url TEXT,
        skills TEXT
      )
    `);
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_name ON agents (name)');
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    const agentWithId = { ...agent, id: agent.id || randomUUID() };
    log(`Adding agent ${agentWithId.name} (${agentWithId.id}) to SQLite registry`);
    try {
      const stmt = this.db.prepare(
        'INSERT INTO agents (id, name, description, protocolVersion, version, url, skills) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run(
        agentWithId.id,
        agentWithId.name,
        agentWithId.description,
        agentWithId.protocolVersion,
        agentWithId.version,
        agentWithId.url,
        JSON.stringify(agentWithId.skills)
      );
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Agent with name ${agent.name} already exists.`);
      }
      throw error;
    }
    return agentWithId;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry | null> {
    log(`Getting agent ${agentId} from SQLite registry`);
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const row = stmt.get(agentId) as any;
    if (!row) {
      return null;
    }
    return this.rowToAgent(row);
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from SQLite registry`);
    const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
    stmt.run(agentId);
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
    log('Listing all agents from SQLite registry');
    const stmt = this.db.prepare('SELECT * FROM agents');
    const rows = stmt.all() as any[];
    return rows.map((row) => this.rowToAgent(row));
  }

  public async update(
    agentId: string,
    agentUpdate: Partial<IAgentRegistryEntry>
  ): Promise<IAgentRegistryEntry> {
    log(`Updating agent ${agentId} in SQLite registry`);
    const existingAgent = await this.get(agentId);
    if (!existingAgent) {
      throw new Error(`Agent with ID ${agentId} not found.`);
    }

    const updatedAgent = { ...existingAgent, ...agentUpdate };

    const stmt = this.db.prepare(
      'UPDATE agents SET name = ?, description = ?, protocolVersion = ?, version = ?, url = ?, skills = ? WHERE id = ?'
    );
    stmt.run(
      updatedAgent.name,
      updatedAgent.description,
      updatedAgent.protocolVersion,
      updatedAgent.version,
      updatedAgent.url,
      JSON.stringify(updatedAgent.skills),
      agentId
    );
    return updatedAgent;
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    log(`Searching for '${query}' in SQLite registry`);
    let agents = await this.list();

    if (!query || query.trim() === '') {
      return agents;
    }

    const parsedQuery = QueryParser.parse(query);

    if (
      parsedQuery.fieldFilters.length === 0 &&
      parsedQuery.generalFilters.length === 0
    ) {
      return agents;
    }

    // Apply field filters
    for (const filter of parsedQuery.fieldFilters) {
      agents = agents.filter((agent) => {
        if (filter.operator === 'has_skill') {
          return agent.skills.some(
            (s) =>
              s.id.toLowerCase() === filter.value.toLowerCase() ||
              s.name.toLowerCase() === filter.value.toLowerCase()
          );
        }
        // Basic property check for other fields
        const agentValue = (agent as any)[filter.field];
        if (typeof agentValue === 'string') {
          return agentValue.toLowerCase().includes(filter.value.toLowerCase());
        }
        return false;
      });
    }

    // Apply general text search filters
    for (const filter of parsedQuery.generalFilters) {
      agents = agents.filter((agent) => {
        return filter.fields.some((field) => {
          const agentValue = (agent as any)[field];
          if (typeof agentValue === 'string') {
            return agentValue.toLowerCase().includes(filter.term.toLowerCase());
          }
          return false;
        });
      });
    }

    return agents;
  }

  public async clear(): Promise<void> {
    log('Clearing all agents from SQLite registry');
    this.db.exec('DELETE FROM agents');
  }

  public async close(): Promise<void> {
    log('Closing SQLite registry connection');
    this.db.close();
  }

  private rowToAgent(row: any): IAgentRegistryEntry {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      protocolVersion: row.protocolVersion,
      version: row.version,
      url: row.url,
      skills: JSON.parse(row.skills),
    };
  }
}
