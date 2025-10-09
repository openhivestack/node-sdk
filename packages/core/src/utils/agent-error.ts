import { AgentErrorTypes } from "../types";

/**
 * Error class that follows H.I.V.E. Protocol error format
 */
export class AgentError extends Error {
  code: AgentErrorTypes;
  retry: boolean;
  httpStatus: number;

  constructor(code: AgentErrorTypes, message: string, retry = false) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.retry = retry;

    // Set HTTP status based on error code
    switch (code) {
      case AgentErrorTypes.INVALID_SIGNATURE:
        this.httpStatus = 401;
        break;
      case AgentErrorTypes.CAPABILITY_NOT_FOUND:
      case AgentErrorTypes.AGENT_NOT_FOUND:
        this.httpStatus = 404;
        break;
      case AgentErrorTypes.INVALID_PARAMETERS:
      case AgentErrorTypes.INVALID_MESSAGE_FORMAT:
      case AgentErrorTypes.CONFIG_ERROR:
        this.httpStatus = 400;
        break;
      case AgentErrorTypes.RATE_LIMITED:
        this.httpStatus = 429;
        break;
      case AgentErrorTypes.RESOURCE_UNAVAILABLE:
        this.httpStatus = 503;
        break;
      case AgentErrorTypes.PROCESSING_FAILED:
      default:
        this.httpStatus = 500;
        break;
    }
  }

  /**
   * Convert error to standard H.I.V.E. Protocol error format
   */
  format(agentId: string, targetId: string, taskId?: string, signature?: string) {
    return {
      from: agentId,
      to: targetId,
      type: AgentErrorTypes.TASK_ERROR,
      data: {
        task_id: taskId || 'config-error',
        error: this.code,
        message: this.message,
        retry: this.retry,
      },
      sig: signature,
    };
  }
}