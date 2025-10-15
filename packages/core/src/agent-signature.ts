import { AgentError } from './agent-error';
import { AgentErrorTypes } from './types';
import debug from 'debug';
import { canonicalize } from 'json-canonicalize';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const log = debug('openhive:agent-signature');

/**
 * Crypto utility for H.I.V.E. Protocol
 * Provides methods for Ed25519 key generation, signing, and verification
 */
export class AgentSignature {
  // Helper to convert Base64URL string (used for raw keys) to a Node.js Buffer
  private static toBuffer(base64Url: string): Buffer {
    // Base64URL is the same as Base64 except '+' is replaced by '-', '/' by '_' and padding '=' is removed.
    // Node's Buffer supports Base64URL natively if we tell it.
    return Buffer.from(base64Url, 'base64url');
  }

  // Helper to convert a Buffer to a Base64URL string
  private static toBase64(buffer: Buffer): string {
    return buffer.toString('base64url');
  }

  /**
   * Converts a JSON object into a canonical string suitable for cryptographic signing.
   * @param {object} payload - The JSON object to canonicalize.
   * @returns {string} The canonical JSON string.
   */
  static canonicalize(payload: any) {
    // Uses the json-canonicalize package to ensure deterministic key order and formatting.
    return canonicalize(payload);
  }

  /**
   * Generate a new Ed25519 key pair
   *
   * @returns Object containing public and private keys as Base64 strings
   */
  static async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    log('Generating new Ed25519 key pair');

    // 1. Generate the key pair
    const keyPair = (await crypto.webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true, // extractable
      ['sign', 'verify']
    )) as crypto.webcrypto.CryptoKeyPair;

    // 2. Export keys as raw bytes (PKCS#8 for private, SubjectPublicKeyInfo for public)
    const privateKeyRaw = await crypto.webcrypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey
    );
    const publicKeyRaw = await crypto.webcrypto.subtle.exportKey(
      'spki',
      keyPair.publicKey
    );

    // 3. Convert ArrayBuffers to Buffers for easy Base64URL encoding
    const privateBuffer = Buffer.from(privateKeyRaw);
    const publicBuffer = Buffer.from(publicKeyRaw);

    log('Key pair generated successfully');
    // 4. Encode to Base64URL string
    return {
      privateKey: AgentSignature.toBase64(privateBuffer),
      publicKey: AgentSignature.toBase64(publicBuffer),
    };
  }

  /**
   * Sign a message using Ed25519 private key
   *
   * @param message - Object to sign
   * @param privateKey - Ed25519 private key as a Base64 string
   * @returns Base64 encoded signature
   */
  static async sign(message: any, privateKey: string): Promise<string> {
    log('Signing message');
    try {
      const canonicalString = AgentSignature.canonicalize(message);

      // 1. Import the Private Key from Base64URL (PKCS#8 format)
      const privateKeyMethod = await crypto.webcrypto.subtle.importKey(
        'pkcs8', // Format for the private key
        AgentSignature.toBuffer(privateKey),
        { name: 'Ed25519' },
        false,
        ['sign']
      );

      // 2. Sign the canonical string (converted to UTF-8 bytes)
      const dataToSign = new TextEncoder().encode(canonicalString);

      const signature = await crypto.webcrypto.subtle.sign(
        'Ed25519',
        privateKeyMethod,
        dataToSign
      );

      log('Signature generated successfully');
      // Convert the signature ArrayBuffer to a Base64URL string
      return AgentSignature.toBase64(Buffer.from(signature));
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
  static async verify(
    message: any,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    log('Verifying message signature');
    try {
      const canonicalString = AgentSignature.canonicalize(message);

      // 1. Import the Public Key from Base64URL (SPKI format)
      const publicKeyMethod = await crypto.webcrypto.subtle.importKey(
        'spki', // Format for the public key
        AgentSignature.toBuffer(publicKey),
        { name: 'Ed25519' },
        false,
        ['verify']
      );

      // 2. Prepare data and signature for verification
      const dataToVerify = new TextEncoder().encode(canonicalString);
      const signatureBuffer = AgentSignature.toBuffer(signature);

      const isValid = await crypto.webcrypto.subtle.verify(
        'Ed25519',
        publicKeyMethod,
        signatureBuffer,
        dataToVerify
      );

      log(`Signature verification completed.`);
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
}
