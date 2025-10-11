import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import { IAgentConfig, IAgentCapability, AgentErrorTypes } from '../types';
import { AgentError } from './agent-error';

/**
 * AgentConfig class for loading and validating H.I.V.E. agent configuration
 */
export class AgentConfig {
  private static DEFAULT_CONFIG: IAgentConfig = {
    endpoint: 'http://localhost:11100',
    logLevel: 'info',
    capabilities: [],
    id: '',
    name: '',
    description: '',
    version: '',
    keys: {
      publicKey: '',
      privateKey: '',
    },
    env: '.env',
  };

  private config: IAgentConfig;

  /**
   * Create a new AgentConfig instance
   *
   * @param config - Either a path to a .hive.yml file or an IAgentConfig object
   */
  constructor(config?: string | IAgentConfig) {
    if (typeof config === 'string') {
      const filePath = config;
      this.config = this.load(filePath);
    } else if (config === undefined) {
      this.config = this.load(path.join(process.cwd(), '.hive.yml'));
    } else {
      this.config = this.validateConfig(config);
    }
  }

  /**
   * Load and parse the configuration file
   */
  private load(filePath: string): IAgentConfig {
    try {
      const envPath = this.config?.env || '.env';
      const env = dotenv.config({
        path: path.join(process.cwd(), envPath),
      }).parsed || {};

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new AgentError(
          AgentErrorTypes.CONFIG_ERROR,
          `Configuration file not found: ${filePath}`
        );
      }

      // Read and parse YAML
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const template = Handlebars.compile(fileContent);
      const compiledConfig = template({
        env: Object.fromEntries(
          Object.entries(env).filter(([key]) => key.startsWith('HIVE_'))
        ),
      });
      const parsedConfig = yaml.load(compiledConfig) as IAgentConfig;

      // Apply defaults and validate
      return this.validateConfig(parsedConfig);
    } catch (error) {
      if (error instanceof AgentError) {
        throw error;
      }

      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        `Failed to load configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate the configuration and apply defaults
   */
  private validateConfig(config: Partial<IAgentConfig>): IAgentConfig {
    // Apply defaults
    const mergedConfig = {
      ...AgentConfig.DEFAULT_CONFIG,
      ...config,
    } as IAgentConfig;

    // Validate required fields
    if (mergedConfig.id?.length === 0) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Missing required field: id'
      );
    }

    // Validate agent ID format (hive:agentid:*)
    if (!mergedConfig.id?.startsWith('hive:agentid:')) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        `Invalid agent ID format: ${mergedConfig.id}. Must start with 'hive:agentid:'`
      );
    }

    if (mergedConfig.name?.length === 0) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Missing required field: name'
      );
    }

    if (mergedConfig.description?.length === 0) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Missing required field: description'
      );
    }

    if (mergedConfig.version?.length === 0) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Missing required field: version'
      );
    }

    // Validate capabilities
    if (
      !Array.isArray(mergedConfig.capabilities) ||
      mergedConfig.capabilities.length === 0
    ) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Agent must define at least one capability'
      );
    }

    // Validate public and private keys
    if (
      mergedConfig.keys.publicKey?.length === 0 ||
      mergedConfig.keys.privateKey?.length === 0
    ) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Missing required field: keys.publicKey or keys.privateKey'
      );
    }

    try {
      mergedConfig.keys.publicKey = Buffer.from(
        mergedConfig.keys.publicKey,
        'base64'
      ).toString('utf8');
      mergedConfig.keys.privateKey = Buffer.from(
        mergedConfig.keys.privateKey,
        'base64'
      ).toString('utf8');
    } catch (error) {
      throw new AgentError(
        AgentErrorTypes.CONFIG_ERROR,
        'Failed to decode base64 keys. Please ensure publicKey and privateKey are correctly encoded.'
      );
    }

    // Validate each capability
    mergedConfig.capabilities.forEach((capability) => {
      if (capability.id?.length === 0) {
        throw new AgentError(
          AgentErrorTypes.CONFIG_ERROR,
          'Capability missing required field: id'
        );
      }

      if (
        capability.input?.length === 0 ||
        typeof capability.input !== 'object'
      ) {
        throw new AgentError(
          AgentErrorTypes.CONFIG_ERROR,
          `Capability "${capability.id}" missing required field: input`
        );
      }

      if (
        capability.output?.length === 0 ||
        typeof capability.output !== 'object'
      ) {
        throw new AgentError(
          AgentErrorTypes.CONFIG_ERROR,
          `Capability "${capability.id}" missing required field: output`
        );
      }
    });

    return mergedConfig;
  }

  /**
   * Get the full configuration
   */
  public info(): IAgentConfig {
    return { ...this.config };
  }

  /**
   * Get agent ID
   */
  public agentId(): string {
    return this.config.id;
  }

  /**
   * Get agent name
   */
  public name(): string {
    return this.config.name;
  }

  /**
   * Get agent description
   */
  public description(): string {
    return this.config.description;
  }

  /**
   * Get agent version
   */
  public version(): string {
    return this.config.version;
  }

  /**
   * Get server port
   */
  public endpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Get log level
   */
  public logLevel(): string {
    return this.config.logLevel;
  }

  /**
   * Get keys
   */
  public keys(): { publicKey: string; privateKey: string } {
    return this.config.keys;
  }

  /**
   * Get all capabilities
   */
  public capabilities(): IAgentCapability[] {
    return [...this.config.capabilities];
  }

  /**
   * Get a specific capability by ID
   */
  public capability(id: string): IAgentCapability | undefined {
    return this.config.capabilities.find((cap) => cap.id === id);
  }

  /**
   * Check if the agent has a specific capability
   */
  public hasCapability(id: string): boolean {
    return this.config.capabilities.some((cap) => cap.id === id);
  }
}
