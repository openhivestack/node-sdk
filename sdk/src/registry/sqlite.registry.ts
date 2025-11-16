import { AgentRegistry, AgentCard, Skill } from '../types';
import { QueryParser } from '../query/engine';
import debug from 'debug';
import { randomUUID } from 'crypto';

const log = debug('openhive:sqlite-registry');

// This is a placeholder since we don't have a real sqlite driver in this environment.
// The actual implementation would use a library like 'sqlite3'.
const Database = class {
  constructor(path: string, callback: (err: Error | null) => void) {
    log(`[FAKE DB] Opening database at ${path}`);
    setTimeout(() => callback(null), 100);
  }
  run(sql: string, params: any[], callback: (err: Error | null) => void) {
    log(`[FAKE DB] Running SQL: ${sql} with params: ${params}`);
    setTimeout(() => callback(null), 100);
  }
  get(sql: string, params: any[], callback: (err: Error | null, row: any) => void) {
    log(`[FAKE DB] Getting SQL: ${sql} with params: ${params}`);
    setTimeout(() => callback(null, null), 100);
  }
  all(sql: string, callback: (err: Error | null, rows: any[]) => void) {
    log(`[FAKE DB] Getting all SQL: ${sql}`);
    setTimeout(() => callback(null, []), 100);
  }
  close(callback: (err: Error | null) => void) {
    log(`[FAKE DB] Closing database`);
    setTimeout(() => callback(null), 100);
  }
};

export class SqliteRegistry implements AgentRegistry {
  public name: string;
  private db: any;
  private queryParser: QueryParser;

  constructor(name: string, dbPath: string, queryParser?: QueryParser) {
    this.name = name;
    this.queryParser = queryParser || new QueryParser();

    // This part would use a real sqlite3 driver.
    // this.db = new sqlite3.Database(dbPath, (err) => {
    //   if (err) {
    //     log(`Error opening database: ${err.message}`);
    //     throw err;
    //   }
    //   log(`SQLite registry '${name}' initialized at ${dbPath}`);
    //   this.createTable();
    // });

    this.db = new Database(dbPath, (err) => {
      if (err) {
        log(`Error opening database: ${err?.message}`);
        throw err;
      }
      log(`SQLite registry '${name}' initialized at ${dbPath}`);
      this.createTable();
    });
  }

  private createTable(): void {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT,
          protocolVersion TEXT,
          version TEXT,
          url TEXT,
          skills TEXT
      )
    `;
    this.db.run(createTableSql, [], (err: Error | null) => {
      if (err) {
        log(`Error creating table: ${err.message}`);
        throw err;
      }
    });
  }

  public async add(agent: AgentCard): Promise<AgentCard> {
    const agentWithId = { ...agent, id: agent.id || randomUUID() };
    const skillsJson = JSON.stringify(agentWithId.skills);
    const sql = `
      INSERT INTO agents (id, name, description, protocolVersion, version, url, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        agentWithId.id,
        agentWithId.name,
        agentWithId.description,
        agentWithId.protocolVersion,
        agentWithId.version,
        agentWithId.url,
        skillsJson
      ], (err: Error | null) => {
        if (err) {
          log(`Error adding agent: ${err.message}`);
          reject(err);
        } else {
          log(`Agent ${agentWithId.name} added to SQLite registry`);
          resolve(agentWithId);
        }
      });
    });
  }

  public async get(agentId: string): Promise<AgentCard | null> {
    const sql = 'SELECT * FROM agents WHERE id = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [agentId], (err: Error | null, row: any) => {
        if (err) {
          log(`Error getting agent: ${err.message}`);
          reject(err);
        } else {
          resolve(row ? { ...row, skills: JSON.parse(row.skills) } : null);
        }
      });
    });
  }

  public async list(): Promise<AgentCard[]> {
    const sql = 'SELECT * FROM agents';
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err: Error | null, rows: any[]) => {
        if (err) {
          log(`Error listing agents: ${err.message}`);
          reject(err);
        } else {
          resolve(rows.map(row => ({ ...row, skills: JSON.parse(row.skills) })));
        }
      });
    });
  }

  public async search(query: string): Promise<AgentCard[]> {
    const agents = await this.list();
    if (!query || query.trim() === '') {
      return agents;
    }

    const parsedQuery = this.queryParser.parse(query);

    return agents.filter((agent) => {
      const generalMatch =
        !parsedQuery.generalFilters.length ||
        parsedQuery.generalFilters.every((filter) => {
          return filter.fields.some((field: string) => {
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
              (s: Skill) => s.id.toLowerCase() === filter.value.toLowerCase() || s.name.toLowerCase() === filter.value.toLowerCase()
            );
          }
          const agentFieldValue =
            agent[filter.field as keyof AgentCard];
          return (
            agentFieldValue &&
            typeof agentFieldValue === 'string' &&
            agentFieldValue.toLowerCase().includes(filter.value.toLowerCase())
          );
        });

      return generalMatch && fieldMatch;
    });
  }

  public async delete(agentId: string): Promise<void> {
    const sql = 'DELETE FROM agents WHERE id = ?';
    return new Promise((resolve, reject) => {
      this.db.run(sql, [agentId], (err: Error | null) => {
        if (err) {
          log(`Error deleting agent: ${err.message}`);
          reject(err);
        } else {
          log(`Agent ${agentId} deleted from SQLite registry`);
          resolve();
        }
      });
    });
  }

  public async update(agentId: string, agentUpdate: Partial<AgentCard>): Promise<AgentCard> {
    const existingAgent = await this.get(agentId);
    if (!existingAgent) {
      throw new Error(`Agent with ID ${agentId} not found.`);
    }
    const updatedAgent = { ...existingAgent, ...agentUpdate, id: agentId };
    const skillsJson = JSON.stringify(updatedAgent.skills);

    const sql = `
      UPDATE agents
      SET name = ?, description = ?, protocolVersion = ?, version = ?, url = ?, skills = ?
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        updatedAgent.name,
        updatedAgent.description,
        updatedAgent.protocolVersion,
        updatedAgent.version,
        updatedAgent.url,
        skillsJson,
        agentId
      ], (err: Error | null) => {
        if (err) {
          log(`Error updating agent: ${err.message}`);
          reject(err);
        } else {
          log(`Agent ${agentId} updated in SQLite registry`);
          resolve(updatedAgent);
        }
      });
    });
  }

  public async clear(): Promise<void> {
    const sql = 'DELETE FROM agents';
    return new Promise((resolve, reject) => {
      this.db.run(sql, [], (err: Error | null) => {
        if (err) {
          log(`Error clearing registry: ${err.message}`);
          reject(err);
        } else {
          log('SQLite registry cleared');
          resolve();
        }
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) {
          log(`Error closing database: ${err.message}`);
          reject(err);
        } else {
          log('SQLite database connection closed');
          resolve();
        }
      });
    });
  }
}
