# H.I.V.E. Protocol Core

Core library for implementing H.I.V.E. Protocol compliant agents.

## Features

- **Message Handling**: Create and validate H.I.V.E. protocol messages
- **Cryptography**: Ed25519 key generation, signing, and verification
- **Agent Management**: Agent identity and capability management
- **Configuration**: Load and validate agent configuration

## Installation

```bash
npm install @openhive/core
```

## Usage

### Creating an Agent

```typescript
import { HiveConfig, HiveAgent, HiveCrypto } from '@openhive/core';

// Load configuration from .hive.yml
const config = new HiveConfig();

// Generate keys or load existing ones
const { publicKey, privateKey } = HiveCrypto.generateKeyPair();

// Create agent
const agent = new HiveAgent(config, privateKey, publicKey);
```

### Sending Messages

```typescript
// Create a task request
const taskRequest = agent.createTaskRequest(
  'hive:agentid:recipient',
  'text-translation',
  { text: 'Hello world', target_lang: 'es' }
);

// Create a capability query
const capabilityQuery = agent.createCapabilityQuery('hive:agentid:recipient');
```

### Processing Messages

```typescript
// Process incoming message
try {
  agent.processMessage(incomingMessage, senderPublicKey);
} catch (error) {
  console.error('Message processing failed:', error.message);
}
```
