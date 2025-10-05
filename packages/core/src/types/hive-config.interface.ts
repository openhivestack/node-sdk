import { Capability } from "./capability.interface";

/**
 * Interface for H.I.V.E. agent configuration
 */
export interface HiveConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  capabilities: Capability[];
}