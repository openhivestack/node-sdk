import * as crypto from 'crypto';
import { HiveError } from './hive-error';
import { HiveErrorType } from '../types';

/**
 * Crypto utility for H.I.V.E. Protocol
 * Provides methods for Ed25519 key generation, signing, and verification
 */
export class Crypto {
  /**
   * Generate a new Ed25519 key pair
   * 
   * @returns Object containing public and private keys in PEM format
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      return { publicKey, privateKey };
    } catch (error) {
      throw new HiveError(
        HiveErrorType.PROCESSING_FAILED,
        `Failed to generate key pair: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
    try {
      const messageString = JSON.stringify(message);
      const signature = crypto.sign(null, Buffer.from(messageString), privateKey);
      return signature.toString('base64');
    } catch (error) {
      throw new HiveError(
        HiveErrorType.PROCESSING_FAILED,
        `Failed to sign message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
    try {
      const messageString = JSON.stringify(message);
      return crypto.verify(
        null,
        Buffer.from(messageString),
        publicKey,
        Buffer.from(signature, 'base64')
      );
    } catch (error) {
      throw new HiveError(
        HiveErrorType.PROCESSING_FAILED,
        `Failed to verify signature: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Generate a random identifier for agent IDs
   * 
   * @returns Random hex string
   */
  static generateUniqueId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Generate a UUID v4 for task IDs
   * 
   * @returns UUID v4 string
   */
  static generateTaskId(): string {
    return crypto.randomUUID();
  }
}
