# Contributing to Carpenter

Thank you for your interest in contributing to Carpenter — the scaffolding and developer-experience layer for the Formworks platform! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Convention](#commit-convention)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Release Process](#release-process)

---

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md). We are committed to maintaining a welcoming, respectful community.

---

## Getting Started

### Prerequisites

- **Node.js** 20 or 22 (LTS recommended)
- **npm** 10+
- **TypeScript** knowledge

### Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/carpenter.git
cd carpenter

# Add upstream remote
git remote add upstream https://github.com/formwork-carpentry/carpenter.git
```

---

## Development Setup

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build

# Lint all packages
npm run lint

# Type-check all packages
npm run typecheck

# Run unit tests
npm run test
```

---

## Project Structure

```
carpenter/
├── packages/
│   └── carpenter/          # Core carpenter CLI package
├── create-carpenter-app/   # Project scaffolding CLI
│   ├── src/                # CLI source code
│   └── tests/              # CLI tests
├── formworks/              # Linked formworks packages (local dev)
├── .github/                # GitHub Actions, templates, config
├── biome.json              # Linting & formatting configuration
├── tsconfig.base.json      # Shared TypeScript configuration
└── package.json            # Root workspace configuration
```

---

## Making Changes

### Branch Naming

```
feat/short-description
fix/short-description
chore/short-description
docs/short-description
refactor/short-description
```

### Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes** in the relevant package(s)

3. **Lint and type-check**:
   ```bash
   npm run lint
   npm run typecheck
   ```

4. **Build**:
   ```bash
   npm run build
   ```

5. **Test**:
   ```bash
   npm run test
   ```

6. **Commit** using conventional commits (see below)

7. **Push** and open a pull request

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI configuration changes |
| `revert` | Revert a previous commit |

### Scopes

Use the package name as scope: `carpenter`, `create-carpenter-app`, etc.

### Examples

```
feat(create-carpenter-app): add TypeScript preset option
fix(carpenter): resolve CLI argument parsing issue
docs: update README quick start guide
chore(deps): upgrade vitest to 4.x
```

---

## Submitting a Pull Request

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Push your branch:
   ```bash
   git push origin feat/my-new-feature
   ```

3. Open a PR on GitHub using the pull request template

4. Fill out all sections of the PR template

5. Ensure all CI checks pass

6. Request a review from the relevant CODEOWNERS

---

## Release Process

Releases are managed by the core team. The process is:

1. Version bump and review via `npm run publish:dry`
2. Tag creation: `git tag v1.x.x`
3. Push tag triggers the publish workflow
4. GitHub Release is automatically created

If you'd like to propose a release, open a discussion issue.

---

## Getting Help

- **Issues**: File bugs and feature requests using the issue templates
- **Security**: See [SECURITY.md](./SECURITY.md) for vulnerability reporting

Thank you for contributing! 🔨
