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

Create a `.hive.yml` file in your project root. This file is the single source of truth for your agent's identity and configuration.

The configuration loader supports environment variable substitution using Handlebars syntax. It automatically loads variables from a `.env` file in your project root (or a file specified under the `env` key).

```yaml
id: 'hive:agentid:hello-world-agent'
name: 'HelloWorldAgent'
description: 'A simple agent that provides greetings.'
version: '0.1.0'
port: 11100

# Agent's cryptographic keys.
# It's highly recommended to load the private key from an environment variable.
keys:
  publicKey: 'base64_encoded_public_key'
  privateKey: '{{env.HIVE_AGENT_PRIVATE_KEY}}'

capabilities:
  - id: 'hello-world'
    description: 'Returns a greeting for a given name.'
    input:
      name: 'string'
    output:
      response: 'string'
```

Place your `HIVE_AGENT_PRIVATE_KEY` in a `.env` file:

```
HIVE_AGENT_PRIVATE_KEY=your_base64_encoded_private_key
```

### 2. Create Your Agent File

Create an `index.ts` file:

```typescript
import { Agent } from '@open-hive/core';

async function main() {
  // 1. Create a new agent instance.
  // By default, it loads the .hive.yml file from the current directory.
  const agent = new Agent();

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

The agent will automatically load its configuration, including its cryptographic keys, from the `.hive.yml` file.

## Agent as a Registry

The `AgentServer` now includes a full set of RESTful endpoints that expose the agent's internal registry, allowing any agent to serve as a discovery hub for a cluster of other agents. This enables agents to dynamically register, deregister, and discover each other over the network.

### Registry API Endpoints

- `POST /registry/add`: Registers an agent. The request body should be an `IAgentRegistryEntry` object.
- `GET /registry/list`: Returns a list of all registered agents.
- `GET /registry/:agentId`: Retrieves the details of a single agent by its ID.
- `DELETE /registry/:agentId`: Removes an agent from the registry.

## Advanced Usage

### Integrating with Existing Frameworks

The `Agent` class is decoupled from the HTTP server, allowing you to integrate its message processing logic into any Node.js framework. Instead of calling `agent.createServer()`, you can use `agent.process()` inside your own route handlers.

**Example with Express:**

```typescript
import { Agent } from '@open-hive/core';
import express from 'express';

// 1. Create agent from config file
const agent = new Agent('.hive.yml');
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
          (responseData as any).task_id,
          responseData.error,
          responseData.message,
          (responseData as any).retry
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

The `Agent` class provides a `sendTask` method to securely communicate with other agents. For agents to communicate, they must first discover each other. The following example demonstrates a realistic scenario with three agents forming a cluster: one agent acts as a central registry, while the other two register with it and then communicate.

This example assumes you have three separate terminal sessions and the necessary `.hive.yml` and `.env` files for each agent.

#### 1. The Registry Agent

This agent's only job is to run and serve as the discovery server for the cluster.

**`registry-agent.ts`**

```typescript
import { Agent } from '@open-hive/core';

// Create a .hive.yml for this agent listening on port 11100
// It needs an ID, keys, etc., but no capabilities are required.

async function main() {
  const registryAgent = new Agent(); // Loads .hive.yml by default
  const server = registryAgent.createServer();
  await server.start();
  console.log(`Registry agent is running at ${registryAgent.endpoint()}`);
}

main().catch(console.error);
```

Run this agent in your first terminal: `ts-node registry-agent.ts`

#### 2. The Responder Agent

This agent provides a `greet` capability and registers itself with the Registry Agent upon startup.

**`responder-agent.ts`**

```typescript
import { Agent } from '@open-hive/core';

// Create a .hive.yml for this agent listening on port 11101
// with a capability called 'greet'.

const REGISTRY_ENDPOINT = 'http://localhost:11100';

async function main() {
  const responderAgent = new Agent();

  responderAgent.capability('greet', async (params) => {
    return { message: `Hello, ${params.name}!` };
  });

  // Register itself with the registry agent
  await responderAgent.register(REGISTRY_ENDPOINT);
  console.log('Responder agent registered successfully.');

  const server = responderAgent.createServer();
  await server.start();
  console.log(`Responder agent is running at ${responderAgent.endpoint()}`);
}

main().catch(console.error);
```

Run this agent in your second terminal: `ts-node responder-agent.ts`

#### 3. The Requester Agent

This agent sends a task to the Responder Agent after discovering it via the Registry Agent.

**`requester-agent.ts`**

```typescript
import { Agent } from '@open-hive/core';

// Create a .hive.yml for this agent listening on port 11102

const REGISTRY_ENDPOINT = 'http://localhost:11100';

async function main() {
  const requesterAgent = new Agent();

  // Register itself with the registry agent
  await requesterAgent.register(REGISTRY_ENDPOINT);
  console.log('Requester agent registered successfully.');

  // 1. Search for agents with the 'greet' capability
  console.log("Searching for agents with 'greet' capability...");
  const searchResults = await requesterAgent.search(
    'capability:greet',
    REGISTRY_ENDPOINT
  );

  if (searchResults.length === 0) {
    console.error('No agents found with the "greet" capability.');
    process.exit(1);
  }

  const responderInfo = searchResults[0];
  console.log(`Found responder agent: ${responderInfo.id}`);

  // 2. Add the discovered agent to its local registry
  await requesterAgent.activeRegistry.add(responderInfo);

  // 3. Now, send the task
  console.log("Requester sending 'greet' task to responder...");
  const result = await requesterAgent.sendTask(responderInfo.id, 'greet', {
    name: 'World',
  });

  console.log('Requester received response:', result);
  process.exit(0);
}

main().catch(console.error);
```

Run this in a third terminal: `ts-node requester-agent.ts`. You should see the successful task exchange!

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
