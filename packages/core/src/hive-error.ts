import { HiveErrorCode } from "./types";

/**
 * Error class that follows H.I.V.E. Protocol error format
 */
export class HiveError extends Error {
  code: HiveErrorCode;
  retry: boolean;
  httpStatus: number;

  constructor(code: HiveErrorCode, message: string, retry = false) {
    super(message);
    this.name = 'HiveError';
    this.code = code;
    this.retry = retry;

    // Set HTTP status based on error code
    switch (code) {
      case HiveErrorCode.INVALID_SIGNATURE:
        this.httpStatus = 401;
        break;
      case HiveErrorCode.CAPABILITY_NOT_FOUND:
      case HiveErrorCode.AGENT_NOT_FOUND:
        this.httpStatus = 404;
        break;
      case HiveErrorCode.INVALID_PARAMETERS:
      case HiveErrorCode.INVALID_MESSAGE_FORMAT:
      case HiveErrorCode.CONFIG_ERROR:
        this.httpStatus = 400;
        break;
      case HiveErrorCode.RATE_LIMITED:
        this.httpStatus = 429;
        break;
      case HiveErrorCode.RESOURCE_UNAVAILABLE:
        this.httpStatus = 503;
        break;
      case HiveErrorCode.PROCESSING_FAILED:
      default:
        this.httpStatus = 500;
        break;
    }
  }

  /**
   * Convert error to standard H.I.V.E. Protocol error format
   */
  toProtocolError(agentId: string, targetId: string, taskId?: string) {
    return {
      from: agentId,
      to: targetId,
      type: 'task_error',
      data: {
        task_id: taskId || 'config-error',
        error: this.code,
        message: this.message,
        retry: this.retry
      },
      // Note: In a real implementation, this would be signed
      sig: 'signature_placeholder'
    };
  }
}