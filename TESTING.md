# Testing Guide

## Setup

Install dependencies:
```bash
pnpm install
```

## Running Tests

### Run all tests once
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run tests with UI
```bash
pnpm test:ui
```

### Run tests with coverage
```bash
pnpm test:coverage
```

### Run tests for a specific package
```bash
# Core package
pnpm --filter @uigen/core test

# CLI package
pnpm --filter @uigen/cli test

# React package
pnpm --filter @uigen/react test
```

### Run a specific test file
```bash
pnpm test packages/core/src/adapter/schema-resolver.test.ts
```

### Run tests matching a pattern
```bash
pnpm test -t "schema resolver"
```

## Test Structure

- **Unit tests**: `*.test.ts` - Test specific functions and classes
- **Property-based tests**: `*.property.test.ts` - Test universal properties with fast-check
- **Integration tests**: `*.integration.test.ts` - Test component interactions

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Property-Based Test Example
```typescript
import { describe, it } from 'vitest';
import fc from 'fast-check';

describe('MyFunction - Property Tests', () => {
  it('should maintain property X for all inputs', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = myFunction(input);
        // Assert property holds
      }),
      { numRuns: 100 }
    );
  });
});
```

## Configuration

- Root config: `vitest.config.ts` - Runs all tests across packages
- Package configs: `packages/*/vitest.config.ts` - Package-specific settings

## Troubleshooting

### Tests not found
Make sure test files match the pattern: `**/*.{test,spec}.{js,ts,jsx,tsx}`

### Import errors
Run `pnpm build` to compile TypeScript before running tests

### Type errors
Run `pnpm typecheck` to check for TypeScript errors
