# Carpenter

Scaffold new Carpenter projects with the right folder structure and formwork packages.

## Quick Start

```bash
# Clone with submodules (pulls formworks automatically)
git clone --recursive https://github.com/formwork-carpentry/carpenter.git
cd carpenter

# Install with bun
bun install

# Build
bun run build

# Create a new project
bunx create-carpenter-app my-app
```

If you already cloned without `--recursive`:

```bash
git submodule update --init --recursive
bun install
```

## Packages

- **carpenter** — CLI wrapper package (`packages/carpenter`)
- **create-carpenter-app** — Interactive project scaffolder
- **formworks/** — Git submodule with all `@formwork/*` packages (including `@formwork/cli`)

## Formwork Packages

The building blocks live in the [formworks](https://github.com/formwork-carpentry/formworks) repo and are pulled in as a git submodule.
