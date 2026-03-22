# Carpenter

Carpenter is the scaffolding and developer-experience layer for the Formworks platform. It provides project generation workflows and CLI utilities for consistent application bootstrapping.

## Components

- `create-carpenter-app`: project scaffolding package
- `packages/carpenter`: CLI package for command-driven workflows
- `formworks/`: linked package source used during local development

## Quick Start

```bash
npm install
npm run build
```

## Create a Project

```bash
npx create-carpenter-app my-app
```

## Engineering Principles

- Predictable scaffolding output
- Clear preset strategy for different project shapes
- Compatibility with npm and Bun developer workflows
