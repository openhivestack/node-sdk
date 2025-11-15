import { IAgentRegistryAdapter, IAgentRegistryEntry } from "../types";

type PluginFunction = (registry: AgentRegistry, ...args: any[]) => void;

export class AgentRegistry {
  private adapter: IAgentRegistryAdapter;
  private plugins: PluginFunction[] = [];

  constructor(adapter: IAgentRegistryAdapter) {
    this.adapter = adapter;
  }

  public use(plugin: PluginFunction, ...args: any[]): this {
    plugin(this, ...args);
    this.plugins.push(plugin);
    return this;
  }

  public async add(agent: IAgentRegistryEntry): Promise<IAgentRegistryEntry> {
    // Basic validation
    if (!agent.name || !agent.url) {
      throw new Error("Agent name and URL are required.");
    }
    return this.adapter.add(agent);
  }

  public async get(agentId: string): Promise<IAgentRegistryEntry | null> {
    return this.adapter.get(agentId);
  }

  public async search(query: string): Promise<IAgentRegistryEntry[]> {
    return this.adapter.search(query);
  }

  public async list(): Promise<IAgentRegistryEntry[]> {
    return this.adapter.list();
  }

  public async remove(agentId: string): Promise<void> {
    return this.adapter.remove(agentId);
  }

  public async update(agentId: string, agent: Partial<IAgentRegistryEntry>): Promise<IAgentRegistryEntry> {
    return this.adapter.update(agentId, agent);
  }

  public async clear(): Promise<void> {
    return this.adapter.clear();
  }

  public async close(): Promise<void> {
    return this.adapter.close();
  }

  public getAdapter(): IAgentRegistryAdapter {
    return this.adapter;
  }
}
