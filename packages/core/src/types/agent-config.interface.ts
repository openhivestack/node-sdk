import { IAgentCapability } from './agent-capability.interface';

/**
 * Interface for H.I.V.E. agent configuration
 */
export interface IAgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  endpoint: string;
  host: string;
  port: number;
  private: boolean;
  keys: {
    publicKey: string;
    privateKey: string;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  capabilities: IAgentCapability[];
  env?: string;
}
