import { AgentRegistry, AgentCard, Skill } from '../types';
import { QueryParser } from '../query/engine';
import debug from 'debug';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const log = debug('openhive:sqlite-registry');

export class SqliteRegistry implements AgentRegistry {
  public name: string;
  private db: Database.Database;
  private queryParser: QueryParser;

  constructor(name: string, dbPath: string, queryParser?: QueryParser) {
    this.name = name;
    this.queryParser = queryParser || new QueryParser();

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    log(`SQLite registry '${name}' initialized at ${dbPath}`);
    this.createTable();
  }

  private createTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT,
          protocolVersion TEXT,
          version TEXT,
          url TEXT,
          skills TEXT
      )
    `);
  }

  public async add(agent: AgentCard): Promise<AgentCard> {
    const agentWithId = { ...agent, id: agent.id || randomUUID() };
    const skillsJson = JSON.stringify(agentWithId.skills);
    const sql = `
      INSERT INTO agents (id, name, description, protocolVersion, version, url, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      this.db
        .prepare(sql)
        .run(
          agentWithId.id,
          agentWithId.name,
          agentWithId.description,
          agentWithId.protocolVersion,
          agentWithId.version,
          agentWithId.url,
          skillsJson
        );
      log(`Agent ${agentWithId.name} added to SQLite registry`);
      return agentWithId;
    } catch (error) {
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Agent with name ${agent.name} already exists.`);
      }
      throw error;
    }
  }

  public async get(agentId: string): Promise<AgentCard | null> {
    const sql = 'SELECT * FROM agents WHERE id = ?';
    const row = this.db.prepare(sql).get(agentId) as any;
    if (!row) {
      return null;
    }
    return { ...row, skills: JSON.parse(row.skills) };
  }

  public async list(): Promise<AgentCard[]> {
    const sql = 'SELECT * FROM agents';
    const rows = this.db.prepare(sql).all() as any[];
    return rows.map((row) => ({ ...row, skills: JSON.parse(row.skills) }));
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
              (s: Skill) =>
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
  }

  public async delete(agentId: string): Promise<void> {
    const sql = 'DELETE FROM agents WHERE id = ?';
    this.db.prepare(sql).run(agentId);
    log(`Agent ${agentId} deleted from SQLite registry`);
  }

  public async update(
    agentId: string,
    agentUpdate: Partial<AgentCard>
  ): Promise<AgentCard> {
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

    this.db
      .prepare(sql)
      .run(
        updatedAgent.name,
        updatedAgent.description,
        updatedAgent.protocolVersion,
        updatedAgent.version,
        updatedAgent.url,
        skillsJson,
        agentId
      );
    log(`Agent ${agentId} updated in SQLite registry`);
    return updatedAgent;
  }

  public async clear(): Promise<void> {
    const sql = 'DELETE FROM agents';
    this.db.prepare(sql).run();
    log('SQLite registry cleared');
  }

  public async close(): Promise<void> {
    this.db.close();
    log('SQLite database connection closed');
  }
}
