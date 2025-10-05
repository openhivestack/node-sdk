import { IAgentCapability } from './agent-capability.interface';

/**
 * Interface for H.I.V.E. agent configuration
 */
export interface IAgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  capabilities: IAgentCapability[];
}
