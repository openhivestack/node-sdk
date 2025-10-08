import {
  IAgentConfig,
  IHiveMessage,
  ITaskErrorData,
  ITaskResultData,
  HiveErrorType,
  HiveMessageType,
  ITaskRequestData,
} from './types';
import { AgentIdentity, Crypto } from './utils';
import { Config } from './utils/config';
import { AgentServer } from './agent-server.js';

type CapabilityHandler = (
  params: Record<string, any>
) => Promise<Record<string, any>>;

export class Agent {
  private config: Config;
  private agentIdentity: AgentIdentity;
  private capabilityHandlers: Map<string, CapabilityHandler> = new Map();
  private peers: Map<string, string> = new Map(); // agentId -> publicKey

  constructor(config: IAgentConfig, privateKey?: string, publicKey?: string) {
    this.config = new Config(config);

    const keys =
      privateKey && publicKey
        ? { privateKey, publicKey }
        : Crypto.generateKeyPair();

    this.agentIdentity = new AgentIdentity(
      this.config,
      keys.privateKey,
      keys.publicKey
    );
  }

  public async handleTaskRequest(
    message: IHiveMessage,
    senderPublicKey: string
  ): Promise<ITaskResultData | ITaskErrorData> {
    const task_id = message.data.task_id || 'unknown';

    if (!this.agentIdentity.verifyMessage(message, senderPublicKey)) {
      return {
        task_id,
        error: HiveErrorType.INVALID_SIGNATURE,
        message: 'Message signature verification failed',
        retry: false,
      };
    }

    if (message.type !== HiveMessageType.TASK_REQUEST) {
      return {
        task_id,
        error: HiveErrorType.INVALID_MESSAGE_FORMAT,
        message: `Invalid message type: ${message.type}. Expected 'task_request'.`,
        retry: false,
      };
    }

    const { capability, params } = message.data as ITaskRequestData;
    const handler = this.capabilityHandlers.get(capability);

    if (!handler) {
      return {
        task_id,
        error: HiveErrorType.CAPABILITY_NOT_FOUND,
        message: `Capability '${capability}' not found or no handler registered.`,
        retry: false,
      };
    }

    try {
      const result = await handler(params);
      return {
        task_id,
        status: 'completed',
        result,
      };
    } catch (error) {
      return {
        task_id,
        error: HiveErrorType.PROCESSING_FAILED,
        message:
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during capability execution.',
        retry: false,
      };
    }
  }

  public capability(id: string, handler: CapabilityHandler) {
    if (!this.config.hasCapability(id)) {
      throw new Error(
        `Capability '${id}' is not defined in the agent configuration.`
      );
    }
    this.capabilityHandlers.set(id, handler);
    return this; // For chaining
  }

  public addPeer(agentId: string, publicKey: string) {
    this.peers.set(agentId, publicKey);
  }

  public getPeerPublicKey(agentId: string): string | undefined {
    return this.peers.get(agentId);
  }

  public getIdentity(): AgentIdentity {
    return this.agentIdentity;
  }

  public getPort(): number {
    return this.config.port();
  }

  public createServer(): AgentServer {
    return new AgentServer(this);
  }
}
