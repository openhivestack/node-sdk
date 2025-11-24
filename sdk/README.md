# @open-hive/sdk

The official TypeScript/JavaScript SDK for the **[OpenHive Platform](https://openhive.sh)**. It provides a lightweight, powerful toolkit for developers to interact with the OpenHive agent registry.

This SDK is designed to complement any A2A (Agent-to-Agent) compliant agent. While you can use any A2A SDK (like `@a2a-js/sdk`) to build your agent's core logic, the OpenHive SDK provides the necessary tools for agent discovery and management within the OpenHive ecosystem.

## ✨ Core Features

- **Simplified Registry**: A robust `OpenHive` class for discovering and managing A2A-compliant agents.
- **Flexible Backends**: Easily configure for different storage backends:
  - **In-Memory (Default)**: Perfect for local development and testing.
  - **Remote**: Connect to a shared OpenHive registry endpoint.
  - **SQLite**: A simple, file-based persistent registry.
- **Powerful Query Engine**: A flexible query parser to find agents based on their name, description, or skills.

## 🚀 Getting Started

### Installation

```sh
npm install @open-hive/sdk
```

### Basic Usage

The `OpenHive` class is the main entry point for all registry operations. By default, it uses a volatile in-memory registry.

```typescript
import { OpenHive } from '@open-hive/sdk';
import { AgentCard } from '@open-hive/sdk';

async function main() {
  // 1. Initialize the registry.
  // By default, it uses an in-memory store.
  const hive = new OpenHive();

  // 2. Define an agent card
  const myAgent: AgentCard = {
    name: 'MyAwesomeAgent',
    protocolVersion: '0.3.0',
    version: '1.0.0',
    url: 'http://localhost:8080',
    skills: [{ id: 'chat', name: 'Chat' }],
  };

  // 3. Add the agent to the registry
  const registeredAgent = await hive.add(myAgent);
  console.log('Agent added:', registeredAgent);

  // 4. Search for agents with the 'chat' skill
  const results = await hive.search('skill:chat');
  console.log('Search results:', results);
}

main();
```

## Registry Configurations

### Remote Registry

To connect to a remote registry, provide the `registryUrl` in the constructor. This is the standard choice for multi-agent clusters where a dedicated agent or service acts as a discovery hub.

```typescript
import { OpenHive } from '@open-hive/sdk';

const hive = new OpenHive({
  registryUrl: 'http://localhost:11100', // URL of the remote registry
  headers: { Authorization: 'Bearer your-optional-auth-token' },
});

// All operations will now be performed against the remote registry.
const agentList = await hive.list();
console.log(agentList);
```

### SQLite Registry

For persistence across restarts without a dedicated registry server, you can use the `SqliteRegistry`. The `OpenHive` class can be configured to use any compliant registry adapter.

_Note: The `SqliteRegistry` is not included in the main `OpenHive` bundle and needs to be imported separately._

```typescript
import { OpenHive, SqliteRegistry } from '@open-hive/sdk';

// 1. Create an instance of the SqliteRegistry.
const sqliteRegistry = new SqliteRegistry('main-db', './agents.db');

// 2. Pass the custom registry to the OpenHive constructor.
const hive = new OpenHive({ registry: sqliteRegistry });

// The agent will now use the SQLite database for all registry operations.
await hive.add({
  name: 'PersistentAgent',
  // ... other agent card properties
});
```

## 🔎 Advanced Search

The query engine allows you to find agents with specific skills or attributes using a simple yet powerful syntax.

### Search by General Term

Provide a single term to search across an agent's `name` and `description`.

```typescript
// Finds agents where 'Awesome' is in the name or description
const results = await hive.search('Awesome');
```

### Search by Specific Fields

Target specific fields using `field:value` syntax. You can also wrap values with spaces in quotes.

```typescript
// Finds agents with the name "My Awesome Agent"
const results = await hive.search('name:"My Awesome Agent"');
```

### Search by Skill

You can find agents that possess a specific skill.

```typescript
// Finds agents with the 'chat' skill
const results = await hive.search('skill:chat');
```

### Combining Filters

Combine multiple filters to create more specific queries.

```typescript
// Finds agents named "MyAwesomeAgent" that also have the 'chat' skill
const results = await hive.search('name:MyAwesomeAgent skill:chat');
```

## 🔧 Extensibility

All registry methods (`add`, `get`, `list`, `search`, `update`, `delete`, `clear`) now accept additional arguments (`...args`), allowing you to pass custom options or context to your registry implementation.

```typescript
// Example: Passing a transaction ID to a custom registry
await hive.add(myAgent, { transactionId: 'tx-123' });
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## ⚖️ Licensing

This project is licensed under the Apache 2.0 License. See the [LICENSE.md](LICENSE.md) file for full details.
