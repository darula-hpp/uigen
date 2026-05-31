---
title: OAuth Configuration
description: Configure OAuth 2.0 social login with Google, GitHub, Facebook, and Microsoft
order: 3
---

# OAuth Configuration

UIGen supports OAuth 2.0 authentication with Google, GitHub, Facebook, and Microsoft, enabling social login alongside or instead of credential-based authentication.

The React web renderer uses the **authorization code flow** with CSRF protection via the `state` parameter. **PKCE** (`code_verifier` / `code_challenge`) for public SPA clients is [planned on the roadmap](/docs/roadmap/index). The React Native renderer already enables PKCE.

## Quick Start

Add the `x-uigen-auth` annotation to your OpenAPI spec's `info` object:

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

## Configuration Schema

### Provider Object

Each OAuth provider requires the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | Provider identifier: `google`, `github`, `facebook`, or `microsoft` |
| `clientId` | string | Yes | OAuth client ID from provider console |
| `redirectUri` | string | Yes | Callback URL (must match provider configuration) |
| `scopes` | string[] | No | OAuth scopes to request (defaults to provider-specific scopes) |
| `enabled` | boolean | No | Whether this provider is enabled (default: `true`) |
| `authorizationUrl` | string | No | Custom authorization endpoint (overrides default) |
| `tokenUrl` | string | No | Custom token endpoint (overrides default) |
| `userInfoUrl` | string | No | Custom user info endpoint (overrides default) |
| `refreshTokenEndpoint` | string | No | Custom refresh token endpoint (defaults to `tokenUrl`) |

### Environment Variables

Use environment variables for sensitive values like client IDs:

```yaml
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: ${GOOGLE_REDIRECT_URI}
```

Set environment variables before running UIGen:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"
npx @uigen-dev/cli serve openapi.yaml
```

## Multiple Providers

Configure multiple OAuth providers (maximum 10):

```yaml
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      scopes:
        - openid
        - email
        - profile
    
    - provider: github
      clientId: ${GITHUB_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      scopes:
        - read:user
        - user:email
    
    - provider: microsoft
      clientId: ${MICROSOFT_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      scopes:
        - openid
        - email
        - profile
```

## Default Scopes

If you omit the `scopes` field, UIGen uses provider-specific defaults:

**Google**:
- `openid`
- `email`
- `profile`

**GitHub**:
- `read:user`
- `user:email`

**Facebook**:
- `email`
- `public_profile`

**Microsoft**:
- `openid`
- `email`
- `profile`

## Custom Endpoints

Override default OAuth endpoints for enterprise or custom deployments:

```yaml
x-uigen-auth:
  providers:
    - provider: github
      clientId: ${GITHUB_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      # GitHub Enterprise endpoints
      authorizationUrl: https://github.company.com/login/oauth/authorize
      tokenUrl: https://github.company.com/login/oauth/access_token
      userInfoUrl: https://github.company.com/api/v3/user
```

## Mixed Authentication

Combine OAuth with credential-based authentication:

```yaml
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback

# Also configure credential-based login
paths:
  /auth/login:
    post:
      x-uigen-login: true
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
```

The login page will show both OAuth buttons and the credential form with an "OR" divider.

## OAuth-Only Mode

For OAuth-only authentication, configure providers without credential endpoints:

```yaml
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback

# No x-uigen-login endpoints
```

The login page will only show OAuth buttons.

## Redirect URI Configuration

The redirect URI must:
- Match exactly in both your OpenAPI spec and provider console
- Use HTTPS in production (HTTP allowed for localhost)
- Point to `/auth/callback` path

**Development**:
```
http://localhost:3000/auth/callback
```

**Production**:
```
https://yourdomain.com/auth/callback
```

## Disabling Providers

Temporarily disable a provider without removing it:

```yaml
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: http://localhost:3000/auth/callback
      enabled: false  # Provider won't appear in UI
```

## Validation Rules

UIGen validates OAuth configuration at startup:

1. **Required fields**: `provider`, `clientId`, `redirectUri` must be present
2. **Provider values**: Must be `google`, `github`, `facebook`, or `microsoft`
3. **Redirect URI format**: Must be a valid URL
4. **HTTPS requirement**: Custom URLs must use HTTPS (except localhost)
5. **Scope format**: Must be an array of non-empty strings
6. **Provider limit**: Maximum 10 providers

Validation errors will prevent the server from starting with clear error messages.

## Security Considerations

### State Parameter
UIGen automatically generates a cryptographically secure state parameter (128-bit entropy) for CSRF protection. The state is:
- Generated using `crypto.getRandomValues()`
- Stored in sessionStorage (single-use)
- Validated on callback
- Cleared after use

### Token Storage
- Access tokens stored in localStorage
- Refresh tokens stored in localStorage
- Tokens cleared on logout
- Tokens included in API requests via Authorization header

### HTTPS Requirement
- All OAuth URLs must use HTTPS in production
- Localhost URLs can use HTTP for development
- Custom endpoints are validated for HTTPS

## Troubleshooting

### "Invalid redirect URI" error
- Ensure redirect URI in spec matches provider console exactly
- Check for trailing slashes (must match)
- Verify protocol (http vs https)

### "Invalid client ID" error
- Verify client ID is correct
- Check environment variable is set
- Ensure no extra whitespace

### "Access denied" error
- User clicked "Cancel" on provider consent screen
- User can try again

### "State mismatch" error
- CSRF protection triggered
- Clear browser storage and try again
- Check for browser extensions interfering with sessionStorage

## Next Steps

- [Google OAuth Setup](/docs/authentication/oauth-google-setup) - Create Google OAuth app
- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - Create GitHub OAuth app
- [Security Best Practices](/docs/authentication/oauth-security) - OAuth security guidelines
- [Troubleshooting Guide](/docs/authentication/oauth-troubleshooting) - Common issues and solutions

## Example: Complete Configuration

```yaml
openapi: 3.0.0
info:
  title: My Application
  version: 1.0.0
  x-uigen-auth:
    providers:
      # Google OAuth
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: ${OAUTH_REDIRECT_URI}
        scopes:
          - openid
          - email
          - profile
      
      # GitHub OAuth
      - provider: github
        clientId: ${GITHUB_CLIENT_ID}
        redirectUri: ${OAUTH_REDIRECT_URI}
        scopes:
          - read:user
          - user:email
      
      # Microsoft OAuth
      - provider: microsoft
        clientId: ${MICROSOFT_CLIENT_ID}
        redirectUri: ${OAUTH_REDIRECT_URI}
        scopes:
          - openid
          - email
          - profile

paths:
  # Your API endpoints here
  /users:
    get:
      summary: List users
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Success

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
```

Set environment variables:

```bash
export GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
export GITHUB_CLIENT_ID="Iv1.1234567890abcdef"
export MICROSOFT_CLIENT_ID="12345678-1234-1234-1234-123456789012"
export OAUTH_REDIRECT_URI="http://localhost:3000/auth/callback"
```

Start the server:

```bash
npx @uigen-dev/cli serve openapi.yaml
```

Visit `http://localhost:3000` and you'll see OAuth login buttons for all three providers.
