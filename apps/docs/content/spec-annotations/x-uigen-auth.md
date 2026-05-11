---
title: x-uigen-auth
description: Configure OAuth 2.0 providers for social login authentication
category: Authentication
targetType: info
---

# x-uigen-auth

Configures OAuth 2.0 providers for social login authentication at the document level. This annotation enables users to authenticate using their existing accounts from Google, GitHub, Facebook, or Microsoft.

## Target

- **Document level** (`info` object in OpenAPI spec)

## Type

Object with `providers` array

## Schema

```typescript
interface OAuthConfig {
  providers: OAuthProvider[];
}

interface OAuthProvider {
  provider: 'google' | 'github' | 'facebook' | 'microsoft';
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  enabled?: boolean;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  refreshTokenEndpoint?: string;
}
```

## Properties

### providers (required)

Array of OAuth provider configurations.

#### provider (required)
- **Type**: `'google' | 'github' | 'facebook' | 'microsoft'`
- **Description**: OAuth provider identifier

#### clientId (required)
- **Type**: `string`
- **Description**: OAuth client ID from provider console
- **Best Practice**: Use environment variables (e.g., `${GOOGLE_CLIENT_ID}`)

#### redirectUri (required)
- **Type**: `string`
- **Description**: Redirect URI for OAuth callback
- **Format**: Must be a valid URL
- **Example**: `http://localhost:3000/auth/callback`

#### scopes (optional)
- **Type**: `string[]`
- **Description**: OAuth scopes to request
- **Default**: Provider-specific defaults are used if omitted
  - Google: `['openid', 'email', 'profile']`
  - GitHub: `['read:user', 'user:email']`
  - Facebook: `['email', 'public_profile']`
  - Microsoft: `['openid', 'email', 'profile']`

#### enabled (optional)
- **Type**: `boolean`
- **Description**: Whether this provider is enabled
- **Default**: `true`

#### authorizationUrl (optional)
- **Type**: `string`
- **Description**: Custom authorization endpoint URL
- **Use Case**: Self-hosted OAuth providers
- **Validation**: Must be HTTPS (except localhost)

#### tokenUrl (optional)
- **Type**: `string`
- **Description**: Custom token endpoint URL
- **Use Case**: Self-hosted OAuth providers
- **Validation**: Must be HTTPS (except localhost)

#### userInfoUrl (optional)
- **Type**: `string`
- **Description**: Custom user info endpoint URL
- **Use Case**: Self-hosted OAuth providers
- **Validation**: Must be HTTPS (except localhost)

#### refreshTokenEndpoint (optional)
- **Type**: `string`
- **Description**: Custom refresh token endpoint URL
- **Use Case**: Self-hosted OAuth providers
- **Validation**: Must be HTTPS (except localhost)

## Examples

### Single Provider (Google)

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        scopes:
          - openid
          - email
          - profile
```

### Multiple Providers

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
      - provider: github
        clientId: ${GITHUB_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
      - provider: facebook
        clientId: ${FACEBOOK_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
      - provider: microsoft
        clientId: ${MICROSOFT_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
```

### Custom Scopes

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: github
        clientId: ${GITHUB_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        scopes:
          - read:user
          - user:email
          - repo
          - gist
```

### Disabled Provider

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
      - provider: facebook
        clientId: ${FACEBOOK_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        enabled: false  # Temporarily disabled
```

### Self-Hosted OAuth Provider

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: github  # Use as base type
        clientId: ${GITLAB_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        authorizationUrl: https://gitlab.company.com/oauth/authorize
        tokenUrl: https://gitlab.company.com/oauth/token
        userInfoUrl: https://gitlab.company.com/api/v4/user
        scopes:
          - read_user
          - email
```

## Config.yaml Alternative

OAuth providers can also be configured in `.uigen/config.yaml`:

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations: {}
auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      scopes:
        - openid
        - email
        - profile
```

## Behavior

### UI Changes

When `x-uigen-auth` is configured:

1. **Login View**: OAuth provider buttons appear above or alongside credential login form
2. **Button Styling**: Each provider has brand-specific colors and logos
3. **Mixed Auth**: OAuth and credential auth can coexist with "OR" divider
4. **OAuth-Only**: If only OAuth providers configured, credential form is hidden

### Authentication Flow

1. User clicks OAuth provider button
2. Redirected to provider's authorization page
3. User grants permissions
4. Redirected back to app with authorization code
5. App exchanges code for access token
6. Token stored in localStorage
7. User profile fetched and stored
8. User redirected to dashboard

### Token Management

- **Access Token**: Stored in localStorage, included in API requests as Bearer token
- **Refresh Token**: Stored in localStorage, used to refresh expired access tokens
- **State Parameter**: CSRF protection with 128-bit entropy
- **Token Refresh**: Automatic retry on 401 responses

## Validation Rules

1. **Required Fields**: `provider`, `clientId`, `redirectUri` must be present
2. **Provider Enum**: Must be one of: `google`, `github`, `facebook`, `microsoft`
3. **Redirect URI**: Must be valid URL format
4. **Custom URLs**: Must be HTTPS (except localhost)
5. **Scopes**: Must be array of non-empty strings
6. **Maximum Providers**: Up to 10 providers supported

## Security Considerations

### CSRF Protection
- State parameter with 128-bit entropy
- State stored in sessionStorage
- Validated on callback

### Token Storage
- Access tokens in localStorage
- Refresh tokens in localStorage
- State parameters in sessionStorage (temporary)

### HTTPS Requirement
- Custom OAuth URLs must use HTTPS
- Localhost exempt for development

### Scope Minimization
- Only request scopes you need
- Use provider defaults when possible

## Environment Variables

Always use environment variables for client IDs:

```bash
# .env
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
FACEBOOK_CLIENT_ID=your-facebook-client-id
MICROSOFT_CLIENT_ID=your-microsoft-client-id
```

## Provider Setup

Each provider requires OAuth app creation in their console:

- **Google**: [Google Cloud Console](https://console.cloud.google.com/)
- **GitHub**: [GitHub Developer Settings](https://github.com/settings/developers)
- **Facebook**: [Facebook Developers](https://developers.facebook.com/)
- **Microsoft**: [Azure Portal](https://portal.azure.com/)

See detailed setup guides:
- [Google OAuth Setup](/authentication/oauth-google-setup)
- [GitHub OAuth Setup](/authentication/oauth-github-setup)
- [Facebook OAuth Setup](/authentication/oauth-facebook-setup)
- [Microsoft OAuth Setup](/authentication/oauth-microsoft-setup)

## Related Annotations

- [`x-uigen-login`](/spec-annotations/x-uigen-login) - Mark credential login endpoints
- [`x-uigen-signup`](/spec-annotations/x-uigen-signup) - Mark sign-up endpoints
- [`x-uigen-profile`](/spec-annotations/x-uigen-profile) - Mark profile endpoints

## Related Documentation

- [OAuth Configuration Guide](/authentication/oauth-configuration)
- [OAuth Security Best Practices](/authentication/oauth-security)
- [OAuth Troubleshooting](/authentication/oauth-troubleshooting)
- [OAuth Login User Guide](/guides/oauth-login)

## Notes

- OAuth can coexist with credential-based authentication
- Config reconciliation syncs between OpenAPI spec and config.yaml
- Provider order in config determines button display order
- OAuth buttons automatically styled with provider brand colors
- User profile automatically fetched after successful authentication
