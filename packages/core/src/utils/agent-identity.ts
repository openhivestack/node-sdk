import { 
  HiveErrorType, 
  IAgentCapability, 
  IHiveMessage,
  HiveMessageType
} from '../types';
import { Config } from './config';
import { Crypto } from './crypto';
import { HiveError } from './hive-error';
import { Message } from './message';

/**
 * AgentIdentity class for H.I.V.E. Protocol agent functionality
 */
export class AgentIdentity {
  private config: Config;
  private privateKey: string;
  private publicKey: string;

  /**
   * Create a new H.I.V.E. agent identity
   * 
   * @param config - Agent configuration
   * @param privateKey - Ed25519 private key in PEM format
   * @param publicKey - Ed25519 public key in PEM format
   */
  constructor(config: Config, privateKey: string, publicKey: string) {
    this.config = config;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  /**
   * Create a new agent identity with a fresh key pair
   * 
   * @param config - Agent configuration
   * @returns New AgentIdentity instance
   */
  static create(config: Config): AgentIdentity {
    const { publicKey, privateKey } = Crypto.generateKeyPair();
    return new AgentIdentity(config, privateKey, publicKey);
  }

  /**
   * Get agent ID
   */
  public id(): string {
    return this.config.agentId();
  }

  /**
   * Get agent name
   */
  public name(): string {
    return this.config.name();
  }

  /**
   * Get agent description
   */
  public description(): string {
    return this.config.description();
  }

  /**
   * Get agent version
   */
  public version(): string {
    return this.config.version();
  }

  /**
   * Get agent capabilities
   */
  public capabilities(): IAgentCapability[] {
    return this.config.capabilities();
  }

  /**
   * Get agent public key
   */
  public getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Create a task request message
   * 
   * @param toAgentId - Recipient agent ID
   * @param capability - Capability ID to request
   * @param params - Parameters for the capability
   * @param taskId - Optional task ID (generated if not provided)
   * @param deadline - Optional deadline for task completion
   * @returns Signed task request message
   */
  public createTaskRequest(
    toAgentId: string,
    capability: string,
    params: Record<string, any>,
    taskId?: string,
    deadline?: string
  ): IHiveMessage {
    return Message.createTaskRequest(
      this.id(),
      toAgentId,
      capability,
      params,
      this.privateKey,
      taskId,
      deadline
    );
  }

  /**
   * Create a task response message
   * 
   * @param toAgentId - Recipient agent ID
   * @param taskId - Task ID
   * @param status - Response status (accepted/rejected)
   * @param estimatedCompletion - Optional estimated completion time
   * @param reason - Optional reason for rejection
   * @returns Signed task response message
   */
  public createTaskResponse(
    toAgentId: string,
    taskId: string,
    status: 'accepted' | 'rejected',
    estimatedCompletion?: string,
    reason?: string
  ): IHiveMessage {
    return Message.createTaskResponse(
      this.id(),
      toAgentId,
      taskId,
      status,
      this.privateKey,
      estimatedCompletion,
      reason
    );
  }

  /**
   * Create a task update message
   * 
   * @param toAgentId - Recipient agent ID
   * @param taskId - Task ID
   * @param progress - Optional progress percentage (0-100)
   * @param message - Optional status message
   * @returns Signed task update message
   */
  public createTaskUpdate(
    toAgentId: string,
    taskId: string,
    progress?: number,
    message?: string
  ): IHiveMessage {
    return Message.createTaskUpdate(
      this.id(),
      toAgentId,
      taskId,
      this.privateKey,
      progress,
      message
    );
  }

  /**
   * Create a task result message
   * 
   * @param toAgentId - Recipient agent ID
   * @param taskId - Task ID
   * @param result - Task result data
   * @returns Signed task result message
   */
  public createTaskResult(
    toAgentId: string,
    taskId: string,
    result: Record<string, any>
  ): IHiveMessage {
    return Message.createTaskResult(
      this.id(),
      toAgentId,
      taskId,
      result,
      this.privateKey
    );
  }

  /**
   * Create a task error message
   * 
   * @param toAgentId - Recipient agent ID
   * @param taskId - Task ID
   * @param error - Error code
   * @param message - Error message
   * @param retry - Whether the task can be retried
   * @param code - Optional HTTP status code
   * @returns Signed task error message
   */
  public createTaskError(
    toAgentId: string,
    taskId: string,
    error: string,
    message: string,
    retry: boolean,
    code?: number
  ): IHiveMessage {
    return Message.createTaskError(
      this.id(),
      toAgentId,
      taskId,
      error,
      message,
      retry,
      this.privateKey,
      code
    );
  }

  /**
   * Create a capability query message
   * 
   * @param toAgentId - Recipient agent ID
   * @param capabilities - Optional specific capabilities to query
   * @returns Signed capability query message
   */
  public createCapabilityQuery(
    toAgentId: string,
    capabilities?: string[]
  ): IHiveMessage {
    return Message.createCapabilityQuery(
      this.id(),
      toAgentId,
      this.privateKey,
      capabilities
    );
  }

  /**
   * Create a capability response message
   * 
   * @param toAgentId - Recipient agent ID
   * @param endpoint - Optional agent endpoint URL
   * @returns Signed capability response message
   */
  public createCapabilityResponse(
    toAgentId: string,
    endpoint?: string
  ): IHiveMessage {
    return Message.createCapabilityResponse(
      this.id(),
      toAgentId,
      this.capabilities(),
      this.privateKey,
      endpoint
    );
  }

  /**
   * Verify a message signature
   * 
   * @param message - Message to verify
   * @param publicKey - Public key to use for verification
   * @returns Boolean indicating if signature is valid
   */
  public verifyMessage(message: IHiveMessage, publicKey: string): boolean {
    return Message.verifySignature(message, publicKey);
  }

  /**
   * Process an incoming message
   * 
   * @param message - Incoming message
   * @param publicKey - Sender's public key
   * @throws HiveError if message is invalid
   */
  public processMessage(message: IHiveMessage, publicKey: string): void {
    // Validate message structure
    Message.validate(message);

    // Verify message is addressed to this agent
    if (message.to !== this.id()) {
      throw new HiveError(
        HiveErrorType.INVALID_MESSAGE_FORMAT,
        `Message not addressed to this agent. Expected: ${this.id()}, Got: ${message.to}`
      );
    }

    // Verify signature
    if (!this.verifyMessage(message, publicKey)) {
      throw new HiveError(
        HiveErrorType.INVALID_SIGNATURE,
        'Message signature verification failed'
      );
    }

    // Process message based on type
    switch (message.type) {
      case HiveMessageType.TASK_REQUEST:
        this.processTaskRequest(message);
        break;
      case HiveMessageType.CAPABILITY_QUERY:
        this.processCapabilityQuery(message);
        break;
      // Add handlers for other message types as needed
    }
  }

  /**
   * Process a task request message
   * 
   * @param message - Task request message
   * @throws HiveError if capability not found
   */
  private processTaskRequest(message: IHiveMessage): void {
    const { capability } = message.data;

    // Check if agent has the requested capability
    if (!this.config.hasCapability(capability)) {
      throw new HiveError(
        HiveErrorType.CAPABILITY_NOT_FOUND,
        `Capability not found: ${capability}`
      );
    }

    // Additional task request processing would go here
    // This would typically involve validating parameters against the capability schema
    // and dispatching the task to a handler
  }

  /**
   * Process a capability query message
   * 
   * @param message - Capability query message
   */
  private processCapabilityQuery(message: IHiveMessage): void {
    // Handle capability query
    // This would typically involve filtering capabilities if specific ones were requested
    // and sending a capability response message
  }
}
