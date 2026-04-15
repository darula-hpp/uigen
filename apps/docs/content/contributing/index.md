---
title: Contributing
description: How to contribute to UIGen.
---

# Contributing

UIGen is open source and contributions are welcome. This page covers how to set up the monorepo, run tests, and submit changes.

## Monorepo setup

UIGen uses pnpm workspaces. You need Node.js 18+ and pnpm 9+.

```bash
# Clone the repo
git clone https://github.com/darula-hpp/uigen.git
cd uigen

# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

## Project structure

```
uigen/
├── packages/
│   ├── core/     # Framework-agnostic adapters and IR
│   ├── react/    # React renderer
│   └── cli/      # CLI entry point
├── apps/
│   └── docs/     # This documentation site
└── examples/     # Example spec files
```

See [ARCHITECTURE.md](https://github.com/darula-hpp/uigen/blob/main/ARCHITECTURE.md) for a detailed breakdown of the architecture and design decisions.

## Running tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @uigen-dev/core test
pnpm --filter @uigen-dev/react test
pnpm --filter @uigen-dev/cli test
```

Tests use Vitest and fast-check for property-based testing.

## Making changes

1. Create a branch from `main`
2. Make your changes
3. Add or update tests
4. Run `pnpm test` to verify everything passes
5. Create a changeset (see below)
6. Open a pull request

## Changesets

UIGen uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs. When you make a change that should be released, create a changeset:

```bash
pnpm changeset
```

This prompts you to:

1. Select which packages have changed
2. Choose the version bump type (major, minor, patch)
3. Write a summary of the changes

The changeset file is committed with your PR. See [RELEASING.md](https://github.com/darula-hpp/uigen/blob/main/RELEASING.md) for the full release process.

## Version bump guidelines

| Type | When to use |
|---|---|
| **Major** | Breaking API changes |
| **Minor** | New backward-compatible features |
| **Patch** | Bug fixes and minor improvements |

## Code style

- TypeScript strict mode is enabled in all packages
- ESLint is configured at the workspace root
- No `any` types without a comment explaining why
- Tests must pass before merging

## Questions

Open an issue on GitHub if you have questions or want to discuss a change before implementing it.
