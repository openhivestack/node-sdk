/**
 * Interface for H.I.V.E. Protocol message structure
 */
export interface IHiveMessage {
  from: string;
  to: string;
  type: HiveMessageType;
  data: any;
  sig: string;
}

/**
 * Message types defined by H.I.V.E. Protocol
 */
export enum HiveMessageType {
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  TASK_UPDATE = 'task_update',
  TASK_RESULT = 'task_result',
  TASK_ERROR = 'task_error',
  CAPABILITY_QUERY = 'capability_query',
  CAPABILITY_RESPONSE = 'capability_response',
  HEARTBEAT = 'heartbeat',
  AGENT_IDENTITY = 'agent_identity',
}

/**
 * Interface for task request message data
 */
export interface ITaskRequestData {
  task_id: string;
  capability: string;
  params: Record<string, any>;
  deadline?: string;
}

/**
 * Interface for task response message data
 */
export interface ITaskResponseData {
  task_id: string;
  status: 'accepted' | 'rejected';
  estimated_completion?: string;
  reason?: string;
}

/**
 * Interface for task update message data
 */
export interface ITaskUpdateData {
  task_id: string;
  status: 'in_progress';
  progress?: number;
  message?: string;
}

/**
 * Interface for task result message data
 */
export interface ITaskResultData {
  task_id: string;
  status: 'completed';
  result: Record<string, any>;
}

/**
 * Interface for task error message data
 */
export interface ITaskErrorData {
  task_id: string;
  error: string;
  message: string;
  retry: boolean;
  code?: number;
}

/**
 * Interface for capability query message data
 */
export interface ICapabilityQueryData {
  capabilities?: string[];
}

/**
 * Interface for capability response message data
 */
export interface ICapabilityResponseData {
  capabilities: Array<{
    id: string;
    input: Record<string, any>;
    output: Record<string, any>;
    description?: string;
  }>;
  endpoint?: string;
}

/**
 * Interface for agent identity message data
 */
export interface IAgentIdentityData {
  agent_id: string;
  public_key: string;
  endpoint: string;
}
