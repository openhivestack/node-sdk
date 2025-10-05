import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { HiveConfig, Capability } from './types';
import { HiveError } from './hive-error';
import { HiveErrorCode } from './types';

/**
 * Config class for loading and validating H.I.V.E. agent configuration
 */
export class Config {
  private static DEFAULT_CONFIG: Partial<HiveConfig> = {
    port: 11100,
    logLevel: 'info',
  };

  private config: HiveConfig;

  /**
   * Load configuration from a .hive.yml file
   * 
   * @param configPath Path to the .hive.yml file (optional, defaults to .hive.yml in current directory)
   */
  constructor(configPath?: string) {
    const filePath = configPath || path.join(process.cwd(), '.hive.yml');
    this.config = this.loadConfigFile(filePath);
  }

  /**
   * Load and parse the configuration file
   */
  private loadConfigFile(filePath: string): HiveConfig {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new HiveError(
          HiveErrorCode.CONFIG_ERROR,
          `Configuration file not found: ${filePath}`
        );
      }

      // Read and parse YAML
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedConfig = yaml.load(fileContent) as Partial<HiveConfig>;
      
      // Apply defaults and validate
      return this.validateConfig(parsedConfig);
    } catch (error) {
      if (error instanceof HiveError) {
        throw error;
      }
      
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate the configuration and apply defaults
   */
  private validateConfig(config: Partial<HiveConfig>): HiveConfig {
    // Apply defaults
    const mergedConfig = { ...Config.DEFAULT_CONFIG, ...config } as HiveConfig;

    // Validate required fields
    if (!mergedConfig.id) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        'Missing required field: id'
      );
    }

    // Validate agent ID format (hive:agentid:*)
    if (!mergedConfig.id.startsWith('hive:agentid:')) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        `Invalid agent ID format: ${mergedConfig.id}. Must start with 'hive:agentid:'`
      );
    }

    if (!mergedConfig.name) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        'Missing required field: name'
      );
    }

    if (!mergedConfig.description) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        'Missing required field: description'
      );
    }

    if (!mergedConfig.version) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        'Missing required field: version'
      );
    }

    // Validate capabilities
    if (!Array.isArray(mergedConfig.capabilities) || mergedConfig.capabilities.length === 0) {
      throw new HiveError(
        HiveErrorCode.CONFIG_ERROR,
        'Agent must define at least one capability'
      );
    }

    // Validate each capability
    mergedConfig.capabilities.forEach(capability => {
      if (!capability.id) {
        throw new HiveError(
          HiveErrorCode.CONFIG_ERROR,
          'Capability missing required field: id'
        );
      }

      if (!capability.input || typeof capability.input !== 'object') {
        throw new HiveError(
          HiveErrorCode.CONFIG_ERROR,
          `Capability "${capability.id}" missing required field: input`
        );
      }

      if (!capability.output || typeof capability.output !== 'object') {
        throw new HiveError(
          HiveErrorCode.CONFIG_ERROR,
          `Capability "${capability.id}" missing required field: output`
        );
      }
    });

    return mergedConfig;
  }

  /**
   * Get the full configuration
   */
  public info(): HiveConfig {
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
  public port(): number {
    return this.config.port;
  }

  /**
   * Get log level
   */
  public logLevel(): string {
    return this.config.logLevel;
  }

  /**
   * Get all capabilities
   */
  public capabilities(): Capability[] {
    return [...this.config.capabilities];
  }

  /**
   * Get a specific capability by ID
   */
  public capability(id: string): Capability | undefined {
    return this.config.capabilities.find(cap => cap.id === id);
  }

  /**
   * Check if the agent has a specific capability
   */
  public hasCapability(id: string): boolean {
    return this.config.capabilities.some(cap => cap.id === id);
  }
}
