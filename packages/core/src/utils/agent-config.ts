import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import debug from 'debug';
import { IAgentConfig, IAgentCapability, AgentErrorTypes } from '../types';
import { AgentError } from './agent-error';

const log = debug('openhive:agent-config');

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
    host: 'localhost',
    port: 11100,
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
      log(`Loading configuration from file: ${filePath}`);
      this.config = this.load(filePath);
    } else if (config === undefined) {
      const filePath = path.join(process.cwd(), '.hive.yml');
      log(`Loading default configuration from: ${filePath}`);
      this.config = this.load(filePath);
    } else {
      log('Loading configuration from object');
      this.config = this.validateConfig(config);
    }
    log('Configuration loaded successfully');
  }

  /**
   * Load and parse the configuration file
   */
  private load(filePath: string): IAgentConfig {
    try {
      log(`Attempting to load config file: ${filePath}`);
      const envPath = this.config?.env || '.env';
      const envFilePath = path.join(process.cwd(), envPath);
      log(`Loading environment variables from: ${envFilePath}`);
      const env =
        dotenv.config({
          path: envFilePath,
        }).parsed || {};

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        const errorMessage = `Configuration file not found: ${filePath}`;
        log(errorMessage);
        throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
      }

      // Read and parse YAML
      log(`Reading and parsing YAML file: ${filePath}`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const template = Handlebars.compile(fileContent);
      const compiledConfig = template({
        env: Object.fromEntries(
          Object.entries(env).filter(([key]) => key.startsWith('HIVE_'))
        ),
      });
      const parsedConfig = yaml.load(compiledConfig) as IAgentConfig;
      parsedConfig.host =
        parsedConfig.host || new URL(parsedConfig.endpoint).host;
      parsedConfig.port =
        parsedConfig.port || parseInt(new URL(parsedConfig.endpoint).port);

      // Apply defaults and validate
      log('Validating configuration');
      return this.validateConfig(parsedConfig);
    } catch (error) {
      const errorMessage = `Failed to load configuration: ${
        error instanceof Error ? error.message : String(error)
      }`;
      log(errorMessage, error);
      if (error instanceof AgentError) {
        throw error;
      }

      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }
  }

  /**
   * Validate the configuration and apply defaults
   */
  private validateConfig(config: Partial<IAgentConfig>): IAgentConfig {
    // Apply defaults
    log('Applying default configuration values');
    const mergedConfig = {
      ...AgentConfig.DEFAULT_CONFIG,
      ...config,
    } as IAgentConfig;

    // Validate required fields
    log('Validating required fields');
    if (mergedConfig.id?.length === 0) {
      const errorMessage = 'Missing required field: id';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    // Validate agent ID format (hive:agentid:*)
    log('Validating agent ID format');
    if (!mergedConfig.id?.startsWith('hive:agentid:')) {
      const errorMessage = `Invalid agent ID format: ${mergedConfig.id}. Must start with 'hive:agentid:'`;
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    if (mergedConfig.name?.length === 0) {
      const errorMessage = 'Missing required field: name';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    if (mergedConfig.description?.length === 0) {
      const errorMessage = 'Missing required field: description';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    if (mergedConfig.version?.length === 0) {
      const errorMessage = 'Missing required field: version';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    // Validate capabilities
    log('Validating capabilities');
    if (
      !Array.isArray(mergedConfig.capabilities) ||
      mergedConfig.capabilities.length === 0
    ) {
      const errorMessage = 'Agent must define at least one capability';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    // Validate public and private keys
    log('Validating keys');
    if (
      mergedConfig.keys.publicKey?.length === 0 ||
      mergedConfig.keys.privateKey?.length === 0
    ) {
      const errorMessage =
        'Missing required field: keys.publicKey or keys.privateKey';
      log(errorMessage);
      throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
    }

    // Validate each capability
    log('Validating each capability');
    mergedConfig.capabilities.forEach((capability) => {
      if (capability.id?.length === 0) {
        const errorMessage = 'Capability missing required field: id';
        log(errorMessage);
        throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
      }

      if (
        capability.input?.length === 0 ||
        typeof capability.input !== 'object'
      ) {
        const errorMessage = `Capability "${capability.id}" missing required field: input`;
        log(errorMessage);
        throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
      }

      if (
        capability.output?.length === 0 ||
        typeof capability.output !== 'object'
      ) {
        const errorMessage = `Capability "${capability.id}" missing required field: output`;
        log(errorMessage);
        throw new AgentError(AgentErrorTypes.CONFIG_ERROR, errorMessage);
      }
    });

    log('Configuration validation complete');
    return mergedConfig;
  }

  /**
   * Get the full configuration
   */
  public info(): IAgentConfig {
    log('Getting full configuration');
    return { ...this.config };
  }

  /**
   * Get agent ID
   */
  public agentId(): string {
    log('Getting agent ID');
    return this.config.id;
  }

  /**
   * Get agent name
   */
  public name(): string {
    log('Getting agent name');
    return this.config.name;
  }

  /**
   * Get agent description
   */
  public description(): string {
    log('Getting agent description');
    return this.config.description;
  }

  /**
   * Get agent version
   */
  public version(): string {
    log('Getting agent version');
    return this.config.version;
  }

  /**
   * Get server port
   */
  public endpoint(): string {
    log('Getting server endpoint');
    return this.config.endpoint;
  }

  /**
   * Get server host
   */
  public host(): string {
    log('Getting server host');
    return this.config.host;
  }

  /**
   * Get server port
   */
  public port(): number {
    log('Getting server port');
    return this.config.port;
  }

  /**
   * Get log level
   */
  public logLevel(): string {
    log('Getting log level');
    return this.config.logLevel;
  }

  /**
   * Get keys
   */
  public keys(): { publicKey: string; privateKey: string } {
    log('Getting keys');
    return this.config.keys;
  }

  /**
   * Get all capabilities
   */
  public capabilities(): IAgentCapability[] {
    log('Getting all capabilities');
    return [...this.config.capabilities];
  }

  /**
   * Get a specific capability by ID
   */
  public capability(id: string): IAgentCapability | undefined {
    log(`Getting capability by ID: ${id}`);
    return this.config.capabilities.find((cap) => cap.id === id);
  }

  /**
   * Check if the agent has a specific capability
   */
  public hasCapability(id: string): boolean {
    log(`Checking if agent has capability: ${id}`);
    return this.config.capabilities.some((cap) => cap.id === id);
  }
}
