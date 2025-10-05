import { HiveErrorType } from "../types";

/**
 * Error class that follows H.I.V.E. Protocol error format
 */
export class HiveError extends Error {
  code: HiveErrorType;
  retry: boolean;
  httpStatus: number;

  constructor(code: HiveErrorType, message: string, retry = false) {
    super(message);
    this.name = 'HiveError';
    this.code = code;
    this.retry = retry;

    // Set HTTP status based on error code
    switch (code) {
      case HiveErrorType.INVALID_SIGNATURE:
        this.httpStatus = 401;
        break;
      case HiveErrorType.CAPABILITY_NOT_FOUND:
      case HiveErrorType.AGENT_NOT_FOUND:
        this.httpStatus = 404;
        break;
      case HiveErrorType.INVALID_PARAMETERS:
      case HiveErrorType.INVALID_MESSAGE_FORMAT:
      case HiveErrorType.CONFIG_ERROR:
        this.httpStatus = 400;
        break;
      case HiveErrorType.RATE_LIMITED:
        this.httpStatus = 429;
        break;
      case HiveErrorType.RESOURCE_UNAVAILABLE:
        this.httpStatus = 503;
        break;
      case HiveErrorType.PROCESSING_FAILED:
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
      type: HiveErrorType.TASK_ERROR,
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