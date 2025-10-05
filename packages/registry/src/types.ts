import { AgentCapability } from '@open-hive/core';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  url: string;
  capabilities: AgentCapability[];
}
