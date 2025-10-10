# Openhive (node-sdk)

This repository contains the official TypeScript/JavaScript SDKs for the **[H.I.V.E. Protocol](https://github.com/openhivestack/protocol)**. It provides a set of tools and packages to help developers build and integrate AI agents with the H.I.V.E. ecosystem.

For details on the protocol check out [H.I.V.E Procotol Specification](https://openhive.sh).

## ✨ Packages

This workspace is a monorepo managed by [Nx](https://nx.dev). It contains the following packages:

| Package                                  | Description                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| [`@open-hive/core`](/packages/core/)     | Core types, interfaces, and error definitions for the H.I.V.E. protocol. |

## 🚀 Getting Started

1. **Install dependencies:**

   ```sh
   yarn install
   ```

2. **Build a package:**

   ```sh
   npx nx build <package-name>
   # Example: npx nx build core
   ```

3. **Run tests:**
   ```sh
   npx nx test <package-name>
   # Example: npx nx test core
   ```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## ⚖️ Licensing

This project is made available under a Dual License model.

### 1. Open Source License (AGPLv3)

The code in this repository is primarily licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.

The AGPLv3 is a strong copyleft license. This means you are free to use, modify, and distribute this software, but if you run a modified version of the software as a public network service (Software as a Service, or SaaS), you must offer the source code of your modified version to your users.

**See the [LICENSE-AGPLv3.txt] file for full details.**

### 2. Commercial License (Proprietary)

If you are an organization that needs to use this software in a proprietary, closed-source product, or if you cannot comply with the AGPLv3's copyleft requirements, you must purchase a **Commercial License**.

For licensing inquiries, please contact us at: **[commercial@openhive.sh]**
