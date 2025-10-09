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
  const server = agent.createServer();
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

The `Agent` class is decoupled from the HTTP server, allowing you to integrate its message processing logic into any Node.js framework. Instead of calling `agent.createServer()`, you can use `agent.process()` inside your own route handlers.

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

  // 1. Look up the sender's public key from the agent's registry
  const senderPublicKey = await agent.publicKey(message.from);
  if (!senderPublicKey) {
    return res.status(401).json({ error: 'Sender public key not found.' });
  }

  // 2. Process the message
  const responseData = await agent.process(message, senderPublicKey);

  // 3. Create and sign the response message
  const identity = agent.identity();
  const responseMessage =
    'error' in responseData
      ? identity.createTaskError(
          message.from,
          responseData.task_id,
          responseData.error,
          responseData.message
        )
      : identity.createTaskResult(
          message.from,
          responseData.task_id,
          responseData.result
        );

  const statusCode = 'error' in responseData ? 500 : 200;
  res.status(statusCode).json(responseMessage);
});

app.listen(3000, () => {
  console.log('Custom server running on port 3000');
});
```

### Communicating with Other H.I.V.E Agents

The `Agent` class provides a `sendTask` method that handles the entire process of sending a task to another agent and receiving a response. This includes creating and signing the request message, sending it to the target agent's endpoint, and verifying the signature of the response.

For agents to communicate, they must be aware of each other. This is managed via an `IAgentRegistry`. For local development, you can use the built-in `InMemoryRegistry`. By registering agents with a shared registry, they can discover each other's endpoints and public keys.

**Example: Sending a Task**

Here's a complete example of a "requester" agent sending a task to a "responder" agent.

```typescript
import { Agent, InMemoryRegistry, IAgentConfig } from '@open-hive/core';

async function main() {
  // 1. Create a shared registry for agent discovery
  const registry = new InMemoryRegistry();

  // 2. Create the "responder" agent with a 'greet' capability
  const responderConfig: IAgentConfig = {
    id: 'hive:agentid:responder',
    name: 'ResponderAgent',
    description: 'An agent that responds to greetings.',
    version: '1.0.0',
    endpoint: 'http://localhost:11101',
    capabilities: [
      {
        id: 'greet',
        description: 'Returns a greeting.',
        input: { name: 'string' },
        output: { message: 'string' },
      },
    ],
  };
  const responderAgent = new Agent(
    responderConfig,
    undefined,
    undefined,
    registry
  );
  responderAgent.capability('greet', async (params) => {
    console.log(`Responder received greet task with params:`, params);
    return { message: `Hello, ${params.name}!` };
  });
  await responderAgent.register();

  // 3. Create the "requester" agent
  const requesterConfig: IAgentConfig = {
    id: 'hive:agentid:requester',
    name: 'RequesterAgent',
    description: 'An agent that sends requests.',
    version: '1.0.0',
    endpoint: 'http://localhost:11102',
    capabilities: [],
  };
  const requesterAgent = new Agent(
    requesterConfig,
    undefined,
    undefined,
    registry
  );
  await requesterAgent.register();

  // 4. Start the responder's server so it can listen for tasks
  const responderServer = responderAgent.createServer();
  await responderServer.start();

  // 5. Use sendTask() to send the task from the requester to the responder
  console.log("Requester sending 'greet' task to responder...");
  const result = await requesterAgent.sendTask(
    'hive:agentid:responder',
    'greet',
    { name: 'World' }
  );

  console.log('Requester received response:', result);

  // In a real application, you would manage server lifecycles properly.
  // For this example, we'll exit after the task is done.
  process.exit(0);
}

main().catch((error) => {
  console.error('An error occurred:', error.message);
  process.exit(1);
});
```

### Advanced Agent Search

The `InMemoryRegistry` now includes a powerful search feature that allows you to find agents using a query syntax inspired by Stripe. You can filter agents by their `name`, `id`, `description`, and `capabilities`.

#### Search by General Term

Provide a single term to search across an agent's `name`, `id`, and `description`.

```typescript
// Finds agents where 'My Agent' is in the name, id, or description
const results = await registry.search('My Agent');
```

#### Search by Specific Fields

Target specific fields using `field:value` syntax.

```typescript
// Finds agents with the name "HelloWorldAgent"
const results = await registry.search('name:HelloWorldAgent');
```

#### Search by Capability

You can find agents that possess a specific capability.

```typescript
// Finds agents with the 'hello-world' capability
const results = await registry.search('capability:hello-world');
```

#### Combining Filters

Combine multiple filters to create more specific queries.

```typescript
// Finds agents named "My Agent" that also have the 'file-reader' capability
const results = await registry.search('name:"My Agent" capability:file-reader');
```
