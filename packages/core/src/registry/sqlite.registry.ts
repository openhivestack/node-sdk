import Database from 'better-sqlite3';
import { IAgentRegistryAdapter, IAgentRegistryEntry } from '../types';
import debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';

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
        name TEXT PRIMARY KEY,
        description TEXT,
        protocolVersion TEXT,
        version TEXT,
        url TEXT,
        skills TEXT
      )
    `);
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    const agentId = agent.name;
    log(`Adding agent ${agentId} to SQLite registry`);
    try {
      const stmt = this.db.prepare(
        'INSERT INTO agents (name, description, protocolVersion, version, url, skills) VALUES (?, ?, ?, ?, ?, ?)'
      );
      stmt.run(
        agent.name,
        agent.description,
        agent.protocolVersion,
        agent.version,
        agent.url,
        JSON.stringify(agent.skills)
      );
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new Error(`Agent with name ${agentId} already exists.`);
      }
      throw error;
    }
    return agent;
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry | null> {
    log(`Getting agent ${agentId} from SQLite registry`);
    const stmt = this.db.prepare('SELECT * FROM agents WHERE name = ?');
    const row = stmt.get(agentId) as any;
    if (!row) {
      return null;
    }
    return this.rowToAgent(row);
  }

  public async remove(agentId: string): Promise<void> {
    log(`Removing agent ${agentId} from SQLite registry`);
    const stmt = this.db.prepare('DELETE FROM agents WHERE name = ?');
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
      throw new Error(`Agent with name ${agentId} not found.`);
    }

    const updatedAgent = { ...existingAgent, ...agentUpdate };

    const stmt = this.db.prepare(
      'UPDATE agents SET description = ?, protocolVersion = ?, version = ?, url = ?, skills = ? WHERE name = ?'
    );
    stmt.run(
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
    const agents = await this.list();

    if (!query || query.trim() === '') {
      return agents;
    }

    const lowerCaseQuery = query.toLowerCase();

    return agents.filter((agent) => {
      const nameMatch = agent.name.toLowerCase().includes(lowerCaseQuery);
      const descriptionMatch = agent.description
        ?.toLowerCase()
        .includes(lowerCaseQuery);
      const skillMatch = agent.skills.some(
        (s) =>
          s.id.toLowerCase().includes(lowerCaseQuery) ||
          s.name.toLowerCase().includes(lowerCaseQuery) ||
          s.description?.toLowerCase().includes(lowerCaseQuery)
      );
      return nameMatch || descriptionMatch || skillMatch;
    });
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
      name: row.name,
      description: row.description,
      protocolVersion: row.protocolVersion,
      version: row.version,
      url: row.url,
      skills: JSON.parse(row.skills),
    };
  }
}
