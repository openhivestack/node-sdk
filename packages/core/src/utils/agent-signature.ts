import { AgentError } from './agent-error';
import { AgentErrorTypes } from '../types';
import debug from 'debug';
import stringify from 'json-stable-stringify';
import * as nacl from 'tweetnacl';
import { v4 as uuidv4 } from 'uuid';

const log = debug('openhive:agent-signature');

/**
 * Crypto utility for H.I.V.E. Protocol
 * Provides methods for Ed25519 key generation, signing, and verification
 */
export class AgentSignature {
  /**
   * Generate a new Ed25519 key pair
   *
   * @returns Object containing public and private keys as Base64 strings
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    log('Generating new Ed25519 key pair');
    const keyPair = nacl.sign.keyPair();

    const publicKey = Buffer.from(keyPair.publicKey).toString('base64');
    const privateKey = Buffer.from(keyPair.secretKey).toString('base64');

    log('Key pair generated successfully');
    return { publicKey, privateKey };
  }

  /**
   * Sign a message using Ed25519 private key
   *
   * @param message - Object to sign
   * @param privateKey - Ed25519 private key as a Base64 string
   * @returns Base64 encoded signature
   */
  static sign(message: any, privateKey: string): string {
    log('Signing message');
    try {
      const messageString = stringify(message);
      const privateKeyBytes = Buffer.from(privateKey, 'base64');
      const signature = nacl.sign.detached(
        Buffer.from(messageString),
        privateKeyBytes
      );
      const signatureB64 = Buffer.from(signature).toString('base64');
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
   * @param publicKey - Ed25519 public key as a Base64 string
   * @returns Boolean indicating if signature is valid
   */
  static verify(message: any, signature: string, publicKey: string): boolean {
    log('Verifying message signature');
    try {
      const messageString = stringify(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');
      const isValid = nacl.sign.detached.verify(
        Buffer.from(messageString),
        signatureBytes,
        publicKeyBytes
      );
      log(`Signature verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      const errorMessage = `Failed to verify signature: ${
        error instanceof Error ? error.message : String(error)
      }`;
      log(errorMessage, error);
      return false;
    }
  }

  /**
   * Generate a UUID v4 for task IDs
   *
   * @returns UUID v4 string
   */
  static generateTaskId(): string {
    const taskId = uuidv4();
    log(`Generated task ID: ${taskId}`);
    return taskId;
  }
}
