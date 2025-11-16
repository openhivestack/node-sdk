# OpenHive SDK for Node.js

This repository contains the official TypeScript/JavaScript SDK for the **[OpenHive Platform](https://openhive.sh)**. It provides a lightweight, powerful toolkit for developers to interact with the OpenHive agent registry.

## Repository Structure

This is an `nx` monorepo containing the following key packages:

-   `sdk`: The primary SDK package (`@open-hive/sdk`) published to npm. All source code for the SDK is located here. See the [package README](./sdk/README.md) for detailed documentation and usage instructions.

## Development

To contribute to the SDK, follow these steps:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/openhivestack/node-sdk.git
    cd node-sdk
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Build the SDK:**
    ```sh
    nx build sdk
    ```

4.  **Run tests:**
    ```sh
    nx test sdk
    ```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## ⚖️ Licensing

This project is licensed under the Apache 2.0 License. See the [LICENSE.md](LICENSE.md) file for full details.
