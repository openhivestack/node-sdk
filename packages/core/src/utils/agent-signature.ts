import * as crypto from 'crypto';
import { AgentError } from './agent-error';
import { AgentErrorTypes } from '../types';
import debug from 'debug';
import stringify from 'json-stable-stringify';

const log = debug('openhive:agent-signature');

/**
 * Crypto utility for H.I.V.E. Protocol
 * Provides methods for Ed25519 key generation, signing, and verification
 */
export class AgentSignature {
  /**
   * Generate a new Ed25519 key pair
   *
   * @returns Object containing public and private keys in PEM format
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    log('Generating new Ed25519 key pair');
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      log('Key pair generated successfully');
      return { publicKey, privateKey };
    } catch (error) {
      const errorMessage = `Failed to generate key pair: ${
        error instanceof Error ? error.message : String(error)
      }`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  /**
   * Sign a message using Ed25519 private key
   *
   * @param message - Object to sign
   * @param privateKey - Ed25519 private key in PEM format
   * @returns Base64 encoded signature
   */
  static sign(message: any, privateKey: string): string {
    log('Signing message');
    try {
      const messageString = stringify(message);
      const signature = crypto.sign(
        null,
        Buffer.from(messageString as string),
        privateKey
      );
      const signatureB64 = signature.toString('base64');
      log(`Message signed successfully. Signature: ${signatureB64}`);
      return signatureB64;
    } catch (error) {
      const errorMessage = `Failed to sign message: ${
        error instanceof Error ? error.message : String(error)
      }`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  /**
   * Verify a message signature using Ed25519 public key
   *
   * @param message - Original message object without signature
   * @param signature - Base64 encoded signature
   * @param publicKey - Ed25519 public key in PEM format
   * @returns Boolean indicating if signature is valid
   */
  static verify(message: any, signature: string, publicKey: string): boolean {
    log('Verifying message signature');
    try {
      const messageString = stringify(message);
      const isValid = crypto.verify(
        null,
        Buffer.from(messageString as string),
        publicKey,
        Buffer.from(signature, 'base64')
      );
      log(`Signature verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      const errorMessage = `Failed to verify signature: ${
        error instanceof Error ? error.message : String(error)
      }`;
      log(errorMessage, error);
      throw new AgentError(AgentErrorTypes.PROCESSING_FAILED, errorMessage);
    }
  }

  /**
   * Generate a random identifier for agent IDs
   *
   * @returns Random hex string
   */
  static generateUniqueId(): string {
    const id = crypto.randomBytes(8).toString('hex');
    log(`Generated unique ID: ${id}`);
    return id;
  }

  /**
   * Generate a UUID v4 for task IDs
   *
   * @returns UUID v4 string
   */
  static generateTaskId(): string {
    const taskId = crypto.randomUUID();
    log(`Generated task ID: ${taskId}`);
    return taskId;
  }
}
