# OpenHive SDK for Node.js

This repository contains the official TypeScript/JavaScript SDK for the **[OpenHive Platform](https://openhive.sh)**. It provides a lightweight, powerful toolkit for developers to interact with the OpenHive agent registry.

This SDK is designed to complement any A2A (Agent-to-Agent) compliant agent. While you can use any A2A SDK (like `@a2a-js/sdk`) to build your agent's core logic, the OpenHive SDK provides the necessary tools for agent discovery and management within the OpenHive ecosystem.

## ✨ Core Features

- **Agent Registry**: A robust `AgentRegistry` class for discovering and managing A2A-compliant agents.
- **Adapter Pattern**: Easily switch between different storage backends for your registry:
    - `InMemoryRegistry`: Perfect for local development and testing.
    - `RemoteRegistry`: Connect to a shared OpenHive registry endpoint.
    - `SqliteRegistry`: A simple, file-based persistent registry.
- **Extensible**: A built-in plugin system allows for easy extension of the registry's functionality.
- **Powerful Query Engine**: A flexible query parser to find agents based on their name, description, or skills.

## 🚀 Getting Started

1. **Installation:**

   ```sh
   npm install @open-hive/sdk
   ```

2. **Basic Usage (In-Memory Registry):**

   ```typescript
   import { AgentRegistry, InMemoryRegistry } from '@open-hive/sdk';
   import { AgentCard } from '@a2a-js/sdk'; // Or use the native AgentCard type from this SDK

   // 1. Initialize the registry with an adapter
   const registry = new AgentRegistry(new InMemoryRegistry());

   // 2. Define an agent
   const myAgent: AgentCard = {
     name: 'MyAwesomeAgent',
     protocolVersion: '0.3.0',
     version: '1.0.0',
     url: 'http://localhost:8080',
     skills: [{ id: 'chat', name: 'Chat' }],
   };

   // 3. Add the agent to the registry
   await registry.add(myAgent);

   // 4. Search for agents
   const results = await registry.search('chat');
   console.log(results);
   ```

## 🔎 Advanced Search

The query engine allows you to find agents with specific skills or attributes.

```typescript
// Find agents with the 'chat' skill
const chatAgents = await registry.search('skill:chat');

// Find agents with "My" in their name or description
const myAgents = await registry.search('My');
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## ⚖️ Licensing

This project is licensed under the Apache 2.0 License. See the [LICENSE.md](LICENSE.md) file for full details.
