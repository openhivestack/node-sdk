import {
  AgentErrorTypes,
  IAgentMessage,
  AgentMessageTypes,
  ITaskRequestData,
  ITaskResponseData,
  ITaskUpdateData,
  ITaskResultData,
  ITaskErrorData,
  ICapabilityQueryData,
  ICapabilityResponseData,
} from '../types';
import { AgentSignature } from './agent-signature';
import { AgentError } from './agent-error';
import debug from 'debug';

const log = debug('openhive:agent-message');

/**
 * Message class for H.I.V.E. Protocol message handling
 */
export class AgentMessage {
  /**
   * Validate a message structure
   *
   * @param message - Message to validate
   * @throws AgentError if message is invalid
   */
  static validate(message: any): void {
    log('Validating message structure');
    // Check required fields
    if (!message) {
      const errorMessage = 'Message is empty or undefined';
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    if (!message.from) {
      const errorMessage = 'Missing required field: from';
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    if (!message.to) {
      const errorMessage = 'Missing required field: to';
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    if (!message.type) {
      const errorMessage = 'Missing required field: type';
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    if (!message.data) {
      const errorMessage = 'Missing required field: data';
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    // Validate agent ID format
    if (!message.from.startsWith('hive:agentid:')) {
      const errorMessage = `Invalid 'from' agent ID format: ${message.from}. Must start with 'hive:agentid:'`;
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    if (!message.to.startsWith('hive:agentid:')) {
      const errorMessage = `Invalid 'to' agent ID format: ${message.to}. Must start with 'hive:agentid:'`;
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    // Validate message type
    const validTypes = Object.values(AgentMessageTypes);
    if (!validTypes.includes(message.type)) {
      const errorMessage = `Invalid message type: ${message.type}`;
      log(errorMessage);
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        errorMessage
      );
    }

    // Validate data based on message type
    log(`Validating data for message type: ${message.type}`);
    switch (message.type) {
      case AgentMessageTypes.TASK_REQUEST:
        this.validateTaskRequest(message.data);
        break;
      case AgentMessageTypes.TASK_RESPONSE:
        this.validateTaskResponse(message.data);
        break;
      case AgentMessageTypes.TASK_UPDATE:
        this.validateTaskUpdate(message.data);
        break;
      case AgentMessageTypes.TASK_RESULT:
        this.validateTaskResult(message.data);
        break;
      case AgentMessageTypes.TASK_ERROR:
        this.validateTaskError(message.data);
        break;
      case AgentMessageTypes.CAPABILITY_QUERY:
        this.validateCapabilityQuery(message.data);
        break;
      case AgentMessageTypes.CAPABILITY_RESPONSE:
        this.validateCapabilityResponse(message.data);
        break;
      default:
        log(`No specific validation for message type: ${message.type}`);
        // Other message types don't have specific validation
        break;
    }
    log('Message validation successful');
  }

  /**
   * Validate task request data
   */
  private static validateTaskRequest(data: any): void {
    if (!data.task_id) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task request missing required field: task_id'
      );
    }

    if (!data.capability) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task request missing required field: capability'
      );
    }

    if (!data.params || typeof data.params !== 'object') {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task request missing required field: params'
      );
    }
  }

  /**
   * Validate task response data
   */
  private static validateTaskResponse(data: any): void {
    if (!data.task_id) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task response missing required field: task_id'
      );
    }

    if (!data.status || !['accepted', 'rejected'].includes(data.status)) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task response missing or invalid field: status (must be "accepted" or "rejected")'
      );
    }
  }

  /**
   * Validate task update data
   */
  private static validateTaskUpdate(data: any): void {
    if (!data.task_id) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task update missing required field: task_id'
      );
    }

    if (!data.status || data.status !== 'in_progress') {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task update missing or invalid field: status (must be "in_progress")'
      );
    }

    if (
      data.progress !== undefined &&
      (typeof data.progress !== 'number' ||
        data.progress < 0 ||
        data.progress > 100)
    ) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task update invalid field: progress (must be a number between 0-100)'
      );
    }
  }

  /**
   * Validate task result data
   */
  private static validateTaskResult(data: any): void {
    if (!data.task_id) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task result missing required field: task_id'
      );
    }

    if (!data.status || data.status !== 'completed') {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task result missing or invalid field: status (must be "completed")'
      );
    }

    if (!data.result || typeof data.result !== 'object') {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task result missing required field: result'
      );
    }
  }

  /**
   * Validate task error data
   */
  private static validateTaskError(data: any): void {
    if (!data.task_id) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task error missing required field: task_id'
      );
    }

    if (!data.error) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task error missing required field: error'
      );
    }

    if (!data.message) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task error missing required field: message'
      );
    }

    if (data.retry === undefined) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Task error missing required field: retry'
      );
    }
  }

  /**
   * Validate capability query data
   */
  private static validateCapabilityQuery(data: any): void {
    // Capability query can be empty or contain a capabilities array
    if (data.capabilities !== undefined && !Array.isArray(data.capabilities)) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Capability query invalid field: capabilities (must be an array)'
      );
    }
  }

  /**
   * Validate capability response data
   */
  private static validateCapabilityResponse(data: any): void {
    if (
      !data.capabilities ||
      !Array.isArray(data.capabilities) ||
      data.capabilities.length === 0
    ) {
      throw new AgentError(
        AgentErrorTypes.INVALID_MESSAGE_FORMAT,
        'Capability response missing required field: capabilities (must be a non-empty array)'
      );
    }

    // Validate each capability
    data.capabilities.forEach((capability: any, index: number) => {
      if (!capability.id) {
        throw new AgentError(
          AgentErrorTypes.INVALID_MESSAGE_FORMAT,
          `Capability at index ${index} missing required field: id`
        );
      }

      if (!capability.input || typeof capability.input !== 'object') {
        throw new AgentError(
          AgentErrorTypes.INVALID_MESSAGE_FORMAT,
          `Capability "${capability.id}" missing required field: input`
        );
      }

      if (!capability.output || typeof capability.output !== 'object') {
        throw new AgentError(
          AgentErrorTypes.INVALID_MESSAGE_FORMAT,
          `Capability "${capability.id}" missing required field: output`
        );
      }
    });
  }

  /**
   * Create a task request message
   */
  static createTaskRequest(
    fromAgentId: string,
    toAgentId: string,
    capability: string,
    params: Record<string, any>,
    privateKey: string,
    taskId?: string,
    deadline?: string
  ): IAgentMessage {
    const data: ITaskRequestData = {
      task_id: taskId || AgentSignature.generateTaskId(),
      capability,
      params,
    };

    if (deadline) {
      data.deadline = deadline;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.TASK_REQUEST,
      data,
      privateKey
    );
  }

  /**
   * Create a task response message
   */
  static createTaskResponse(
    fromAgentId: string,
    toAgentId: string,
    taskId: string,
    status: 'accepted' | 'rejected',
    privateKey: string,
    estimatedCompletion?: string,
    reason?: string
  ): IAgentMessage {
    const data: ITaskResponseData = {
      task_id: taskId,
      status,
    };

    if (estimatedCompletion) {
      data.estimated_completion = estimatedCompletion;
    }

    if (reason) {
      data.reason = reason;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.TASK_RESPONSE,
      data,
      privateKey
    );
  }

  /**
   * Create a task update message
   */
  static createTaskUpdate(
    fromAgentId: string,
    toAgentId: string,
    taskId: string,
    privateKey: string,
    progress?: number,
    message?: string
  ): IAgentMessage {
    const data: ITaskUpdateData = {
      task_id: taskId,
      status: 'in_progress',
    };

    if (progress !== undefined) {
      data.progress = progress;
    }

    if (message) {
      data.message = message;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.TASK_UPDATE,
      data,
      privateKey
    );
  }

  /**
   * Create a task result message
   */
  static createTaskResult(
    fromAgentId: string,
    toAgentId: string,
    taskId: string,
    result: Record<string, any>,
    privateKey: string
  ): IAgentMessage {
    const data: ITaskResultData = {
      task_id: taskId,
      status: 'completed',
      result,
    };

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.TASK_RESULT,
      data,
      privateKey
    );
  }

  /**
   * Create a task error message
   */
  static createTaskError(
    fromAgentId: string,
    toAgentId: string,
    taskId: string,
    error: string,
    message: string,
    retry: boolean,
    privateKey: string,
    code?: number
  ): IAgentMessage {
    const data: ITaskErrorData = {
      task_id: taskId,
      error,
      message,
      retry,
    };

    if (code) {
      data.code = code;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.TASK_ERROR,
      data,
      privateKey
    );
  }

  /**
   * Create a capability query message
   */
  static createCapabilityQuery(
    fromAgentId: string,
    toAgentId: string,
    privateKey: string,
    capabilities?: string[]
  ): IAgentMessage {
    const data: ICapabilityQueryData = {};

    if (capabilities) {
      data.capabilities = capabilities;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.CAPABILITY_QUERY,
      data,
      privateKey
    );
  }

  /**
   * Create a capability response message
   */
  static createCapabilityResponse(
    fromAgentId: string,
    toAgentId: string,
    capabilities: Array<{
      id: string;
      input: Record<string, any>;
      output: Record<string, any>;
      description?: string;
    }>,
    privateKey: string,
    endpoint?: string
  ): IAgentMessage {
    const data: ICapabilityResponseData = {
      capabilities,
    };

    if (endpoint) {
      data.endpoint = endpoint;
    }

    return this.createMessage(
      fromAgentId,
      toAgentId,
      AgentMessageTypes.CAPABILITY_RESPONSE,
      data,
      privateKey
    );
  }

  /**
   * Create a generic message
   */
  private static createMessage(
    fromAgentId: string,
    toAgentId: string,
    type: AgentMessageTypes,
    data: any,
    privateKey: string
  ): IAgentMessage {
    log(
      `Creating message of type '${type}' from '${fromAgentId}' to '${toAgentId}'`
    );
    // Create message without signature
    const messageWithoutSig = {
      from: fromAgentId,
      to: toAgentId,
      type,
      data,
    };

    // Sign message
    log('Signing message');
    const sig = AgentSignature.sign(messageWithoutSig, privateKey);

    // Return complete message
    const message = {
      ...messageWithoutSig,
      sig,
    };
    log(`Message created with signature: ${sig}`);
    return message;
  }

  /**
   * Verify a message signature
   */
  static verifySignature(message: IAgentMessage, publicKey: string): boolean {
    log(`Verifying signature for message from '${message.from}'`);
    const { sig, ...messageWithoutSig } = message;
    const isValid = AgentSignature.verify(messageWithoutSig, sig, publicKey);
    log(`Signature is ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  }
}
