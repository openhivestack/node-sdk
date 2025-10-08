# @open-hive/core

The official core library for building agents on the H.I.V.E. Protocol. This package provides the essential tools to bootstrap a protocol-compliant agent, handle secure messaging, and manage agent capabilities, with a focus on developer experience and flexibility.

## Features

- **High-Level Agent Class**: A simple, powerful `Agent` class to get started in minutes.
- **Flexible Deployment**: A decoupled `AgentServer` allows you to run the agent as a standalone server or integrate its logic into existing frameworks like Next.js, NestJS, or others.
- **Simplified Capability Management**: An intuitive `capability()` method for registering handlers for your agent's skills.
- **Protocol Compliance**: Built-in, protocol-compliant message creation, validation, and cryptographic handling (Ed25519).
- **Configuration-Driven**: Easily configure your agent using a `.hive.yml` file.

## Installation

```bash
npm install @open-hive/core
```

## Quick Start

Here's how to create a complete, hive agent in just a few steps.

### 1. Configure Your Agent

Create a `.hive.yml` file in your project root:

```yaml
id: 'hive:agentid:hello-world-agent'
name: 'HelloWorldAgent'
description: 'A simple agent that provides greetings.'
version: '0.1.0'
port: 11100

capabilities:
  - id: 'hello-world'
    description: 'Returns a greeting for a given name.'
    input:
      name: 'string'
    output:
      response: 'string'
```

### 2. Create Your Agent File

Create an `index.ts` file:

```typescript
import { Agent, IAgentConfig } from '@open-hive/core';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

// Load agent configuration from .hive.yml
const config = load(readFileSync('.hive.yml', 'utf8')) as IAgentConfig;

async function main() {
  // 1. Create a new agent instance
  const agent = new Agent(config);

  // 2. Register a handler for the 'hello-world' capability
  agent.capability('hello-world', async (params) => {
    const { name } = params;
    if (!name) {
      throw new Error("The 'name' parameter is required.");
    }
    // Return the result directly
    return { response: `Hello, ${name}!` };
  });

  // 3. Create and start the HTTP server
  const server = agent.asServer();
  await server.start();

  console.log(`Agent is running and ready for tasks.`);
}

main().catch((error) => {
  console.error(`Failed to start agent: ${error.message}`);
  process.exit(1);
});
```

### 3. Run Your Agent

You can now compile and run your `index.ts` file. Your agent will start an HTTP server on port `11100` and be ready to accept `task_request` messages for its `hello-world` capability.

## Advanced Usage

### Integrating with Existing Frameworks

The `Agent` class is decoupled from the HTTP server, allowing you to integrate it into any Node.js framework. Instead of calling `agent.createServer()`, you can use `agent.handleTaskRequest()` inside your own route handlers.

**Example with Express:**

```typescript
import { Agent } from '@open-hive/core';
import express from 'express';

// (Agent setup is the same as above)
const agent = new Agent(config);
// ... register capabilities ...

const app = express();
app.use(express.json());

// Integrate into your own /tasks endpoint
app.post('/tasks', async (req, res) => {
  const message = req.body;
  // You are responsible for peer public key management
  const senderPublicKey = getPublicKeyForAgent(message.from);

  const responseData = await agent.handleTaskRequest(message, senderPublicKey);

  // You are responsible for creating and signing the response message
  const responseMessage = createAndSignResponseMessage(responseData);

  const statusCode = 'error' in responseData ? 500 : 200;
  res.status(statusCode).json(responseMessage);
});

app.listen(3000, () => {
  console.log('Custom server running on port 3000');
});
```

### Communicating with Other Agents

You can configure peers to enable agent-to-agent communication.

```typescript
// Add a peer agent's public key
agent.addPeer(
  'hive:agentid:some-peer-id',
  '...peer-public-key-in-pem-format...'
);

// Get the agent's identity to create messages
const identity = agent.getIdentity();

// Create a task request message to send to the peer
const taskRequest = identity.createTaskRequest(
  'hive:agentid:some-peer-id',
  'some-capability',
  { parameter: 'value' }
);

// Now you can send this `taskRequest` object to the peer's /tasks endpoint.
```
