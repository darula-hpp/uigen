# OAuth Reconciliation Integration

## Overview

The OAuth reconciliation feature enables bidirectional synchronization of OAuth provider configurations between `config.yaml` and OpenAPI specifications through the main `Reconciler` class.

## How It Works

### 1. Configuration Structure

The `config.yaml` file can include an `auth` section with OAuth providers:

```yaml
version: "1.0"
auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: https://myapp.com/auth/callback
      scopes:
        - openid
        - email
        - profile
    - provider: github
      clientId: ${GITHUB_CLIENT_ID}
      redirectUri: https://myapp.com/auth/callback
      scopes:
        - read:user
        - user:email
```

### 2. Reconciliation Flow

When the `Reconciler.reconcile()` method is called:

1. **Annotation Merge**: First, regular annotations are merged from config to spec
2. **OAuth Reconciliation**: If `config.auth` exists, the `AuthReconciler` is invoked
3. **Validation**: OAuth provider configurations are validated
4. **Sync to Spec**: Valid providers are synced to the OpenAPI spec's `x-uigen-auth` annotation
5. **Error Reporting**: Validation errors are reported as warnings

### 3. Integration Points

#### Main Reconciler (`reconciler.ts`)

```typescript
// Reconcile OAuth providers if auth config exists
let reconciledSpec = mergeResult.modifiedSpec;
if (config.auth) {
  this.logger.info('Reconciling OAuth providers', {
    providerCount: config.auth.providers?.length || 0,
  });

  const authResult = this.authReconciler.reconcile(reconciledSpec, config);
  reconciledSpec = authResult.spec;

  // Add OAuth validation errors as warnings
  if (authResult.errors.length > 0) {
    for (const error of authResult.errors) {
      this.logger.warn(`OAuth configuration error: ${error}`);
      warnings.push({
        elementPath: 'config.auth.providers',
        message: error,
      });
    }
  }
}
```

#### ConfigFile Interface

The `ConfigFile` interface was extended to include the optional `auth` section:

```typescript
interface ConfigFile {
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
  relationships?: RelationshipConfig[];
  auth?: {
    providers?: OAuthProviderConfig[];
  };
}
```

### 4. Validation and Error Reporting

OAuth validation errors are reported as reconciliation warnings:

- **Element Path**: `config.auth.providers`
- **Message**: Specific validation error (e.g., "Provider 1: clientId field is required")
- **Logging**: Errors are logged at WARN level

Example warning:

```typescript
{
  elementPath: 'config.auth.providers',
  message: 'Provider 1: clientId field is required'
}
```

### 5. Reconciliation Rules

1. **Config as Source of Truth**: Values in `config.yaml` override OpenAPI spec
2. **Add Providers**: New providers in config are added to spec
3. **Remove Providers**: Providers removed from config are removed from spec
4. **Disable Providers**: Providers with `enabled: false` are filtered out
5. **Preserve Order**: Provider order from config is maintained

### 6. Usage Example

```typescript
import { Reconciler } from '@uigen-dev/core';

const reconciler = new Reconciler({
  logLevel: 'info',
  validateOutput: true,
  strictMode: false,
});

const result = reconciler.reconcile(openApiSpec, config);

// Check for OAuth validation errors
const oauthWarnings = result.warnings.filter(
  (w) => w.elementPath === 'config.auth.providers'
);

if (oauthWarnings.length > 0) {
  console.log('OAuth configuration errors:');
  oauthWarnings.forEach((w) => console.log(`  - ${w.message}`));
}

// Use reconciled spec with OAuth providers
const reconciledSpec = result.spec;
```

## Testing

### Unit Tests

- **Location**: `src/reconciler/__tests__/unit/reconciler-oauth.test.ts`
- **Coverage**: 11 test cases covering:
  - Provider reconciliation
  - Validation error reporting
  - Multiple providers
  - Disabled providers
  - Integration with annotation reconciliation

### Integration Tests

- **Location**: `src/reconciler/__tests__/integration/oauth-reconciliation.integration.test.ts`
- **Coverage**: 5 test cases covering:
  - Complete reconciliation flow
  - Validation error reporting
  - Config as source of truth
  - Provider removal scenarios

## Related Components

- **AuthReconciler**: `src/reconciler/auth-reconciler.ts` - Handles OAuth-specific reconciliation logic
- **AuthHandler**: `src/adapter/annotations/handlers/auth-handler.ts` - Processes `x-uigen-auth` annotations
- **OAuthProviderConfig**: Type definition for OAuth provider configuration

## Requirements Satisfied

This integration satisfies **Requirement 16.9** from the OAuth authentication support spec:

> THE reconciler SHALL validate OAuth provider configurations during reconciliation and report validation errors

The implementation:
- ✅ Calls AuthReconciler from main reconciliation flow
- ✅ Validates OAuth configurations during reconciliation
- ✅ Reports validation errors to user as warnings
- ✅ Maintains backward compatibility with existing reconciliation
- ✅ Supports bidirectional sync between config and spec
