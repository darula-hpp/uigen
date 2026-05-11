---
title: Using Environment Variables in Config Files
description: Securely manage sensitive configuration values using environment variable references
order: 6
---

# Using Environment Variables in Config Files

UIGen supports environment variable references in your `.uigen/config.yaml` file using the `${ENV_VAR_NAME}` syntax. This enables you to keep sensitive values like OAuth credentials, API keys, and other secrets out of version control while maintaining a clean, shareable configuration structure.

## Why Use Environment Variables?

**Security**: Keep sensitive credentials out of your repository. OAuth client secrets, API keys, and database URLs should never be committed to version control.

**Flexibility**: Use different values across environments (development, staging, production) without modifying your config file.

**Team Collaboration**: Share config files safely. Team members can use their own credentials without conflicts.

**Best Practice**: Following the [Twelve-Factor App](https://12factor.net/config) methodology for configuration management.

## Basic Syntax

Reference environment variables using the `${ENV_VAR_NAME}` syntax:

```yaml
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: ${GOOGLE_REDIRECT_URI}
```

When UIGen processes your config file, it automatically replaces `${GOOGLE_CLIENT_ID}` with the actual value from your environment.

## Setting Environment Variables

### Development (Local)

Create a `.env` file in your project root:

```bash
# .env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
API_BASE_URL=http://localhost:8000
```

**Important**: Add `.env` to your `.gitignore` to prevent committing secrets:

```gitignore
# .gitignore
.env
.env.local
```

### Loading .env Files

UIGen automatically loads `.env` files when you run commands. You can also use tools like:

**dotenv-cli**:
```bash
npm install -g dotenv-cli
dotenv npx @uigen-dev/cli serve openapi.yaml
```

**direnv** (automatic loading):
```bash
# Install direnv, then create .envrc
echo "dotenv" > .envrc
direnv allow
```

### Production

Set environment variables through your hosting platform:

**Vercel**:
```bash
vercel env add GOOGLE_CLIENT_ID
```

**Netlify**:
```bash
netlify env:set GOOGLE_CLIENT_ID "your-value"
```

**Docker**:
```bash
docker run -e GOOGLE_CLIENT_ID="your-value" your-image
```

**Kubernetes**:
```yaml
env:
  - name: GOOGLE_CLIENT_ID
    valueFrom:
      secretKeyRef:
        name: oauth-secrets
        key: google-client-id
```

## Common Use Cases

### OAuth Configuration

The most common use case is securing OAuth credentials:

```yaml
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: ${GOOGLE_REDIRECT_URI}
          scopes:
            - openid
            - email
            - profile
        
        - provider: github
          clientId: ${GITHUB_CLIENT_ID}
          redirectUri: ${GITHUB_REDIRECT_URI}
          scopes:
            - user:email
            - read:user
```

**.env file**:
```bash
# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

### API Endpoints

Use environment variables for API base URLs that change across environments:

```yaml
annotations:
  document:
    x-uigen-app:
      name: "My Application"
      apiBaseUrl: ${API_BASE_URL}
```

**.env files for different environments**:

```bash
# .env.development
API_BASE_URL=http://localhost:8000

# .env.staging
API_BASE_URL=https://staging-api.example.com

# .env.production
API_BASE_URL=https://api.example.com
```

### Partial String Replacement

Environment variables work within larger strings:

```yaml
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: http://localhost:${PORT}/auth/callback
```

**.env**:
```bash
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
PORT=8000
```

Result: `http://localhost:8000/auth/callback`

### Multiple References in One String

You can use multiple environment variables in a single value:

```yaml
annotations:
  document:
    x-uigen-app:
      apiUrl: ${API_PROTOCOL}://${API_HOST}:${API_PORT}/api
```

**.env**:
```bash
API_PROTOCOL=https
API_HOST=api.example.com
API_PORT=443
```

Result: `https://api.example.com:443/api`

## Nested Structures

Environment variables work at any depth in your config structure:

```yaml
annotations:
  document:
    x-uigen-app:
      name: "My App"
      settings:
        api:
          baseUrl: ${API_BASE_URL}
          timeout: 5000
        auth:
          providers:
            - provider: google
              credentials:
                clientId: ${GOOGLE_CLIENT_ID}
                clientSecret: ${GOOGLE_CLIENT_SECRET}
```

The resolver recursively processes all nested objects and arrays, replacing environment variable references wherever they appear.

## Error Handling

### Missing Environment Variables

If a referenced environment variable is not defined, UIGen will fail with a clear error message:

```
Error: Environment variable "GOOGLE_CLIENT_ID" is not defined
Referenced at: annotations.document.x-uigen-auth.providers[0].clientId
```

This fail-fast behavior prevents running your application with incomplete configuration.

### Troubleshooting

**Error: "Environment variable not defined"**

Check:
1. Variable is set in your environment: `echo $GOOGLE_CLIENT_ID`
2. Variable name matches exactly (case-sensitive)
3. `.env` file is in the correct location (project root)
4. `.env` file is being loaded (use `dotenv-cli` if needed)

**Variable not being replaced**

Check:
1. Syntax is correct: `${VAR_NAME}` not `$VAR_NAME` or `{VAR_NAME}`
2. Variable name contains only uppercase letters, numbers, and underscores
3. No spaces inside the braces: `${VAR}` not `${ VAR }`

## Best Practices

### 1. Use .env.example for Documentation

Create a `.env.example` file with placeholder values:

```bash
# .env.example
# Copy this file to .env and fill in your actual values

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback

# API Configuration
API_BASE_URL=http://localhost:8000
```

Commit `.env.example` to version control, but never commit `.env`.

### 2. Use Descriptive Variable Names

Choose clear, descriptive names:

**Good**:
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_REDIRECT_URI=...
DATABASE_URL=...
```

**Avoid**:
```bash
GID=...
REDIR=...
DB=...
```

### 3. Group Related Variables

Use prefixes to group related configuration:

```bash
# OAuth - Google
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_REDIRECT_URI=...

# OAuth - GitHub
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_REDIRECT_URI=...

# API Configuration
API_BASE_URL=...
API_TIMEOUT=...
```

### 4. Document Required vs Optional

In your `.env.example`, document which variables are required:

```bash
# Required: Google OAuth credentials
GOOGLE_CLIENT_ID=

# Optional: Custom redirect URI (defaults to http://localhost:8000/auth/callback)
GOOGLE_REDIRECT_URI=
```

### 5. Never Log Environment Variable Values

When debugging, log variable names but never their values:

```javascript
// Good
console.log('Using GOOGLE_CLIENT_ID from environment');

// Bad - exposes secrets in logs
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
```

### 6. Use Different .env Files per Environment

Maintain separate environment files:

```
.env.development
.env.staging
.env.production
.env.example
```

Load the appropriate file based on your environment:

```bash
# Development
cp .env.development .env

# Staging
cp .env.staging .env

# Production (use platform-specific secrets management)
```

### 7. Validate Environment Variables Early

Check that all required variables are set before starting your application:

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "GOOGLE_CLIENT_ID"
  "GOOGLE_REDIRECT_URI"
  "API_BASE_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

echo "All required environment variables are set"
```

## Security Considerations

### What to Store in Environment Variables

**Do store**:
- OAuth client IDs and secrets
- API keys and tokens
- Database connection strings
- Third-party service credentials
- Encryption keys
- Session secrets

**Don't store**:
- Public configuration (app name, theme colors)
- Non-sensitive URLs (unless they vary by environment)
- Feature flags (unless they contain sensitive logic)

### Protecting Your Secrets

1. **Never commit .env files**: Always add to `.gitignore`
2. **Use secrets management**: In production, use platform-specific secrets (AWS Secrets Manager, Azure Key Vault, etc.)
3. **Rotate credentials regularly**: Change OAuth secrets and API keys periodically
4. **Limit access**: Only give team members access to secrets they need
5. **Audit access**: Track who accesses production secrets

### Environment Variable Naming

Use uppercase with underscores for environment variables:

**Valid**:
```bash
GOOGLE_CLIENT_ID
API_BASE_URL
DATABASE_CONNECTION_STRING
MAX_FILE_SIZE_MB
```

**Invalid** (will not be recognized):
```bash
googleClientId      # lowercase
Google-Client-ID    # hyphens
google.client.id    # dots
```

## Complete Example

Here's a complete example showing environment variable usage:

**config.yaml**:
```yaml
version: "1.0"
enabled:
  x-uigen-auth: true
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "Meeting Minutes Pro"
      apiBaseUrl: ${API_BASE_URL}
    
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: ${GOOGLE_REDIRECT_URI}
          scopes:
            - openid
            - email
            - profile
        
        - provider: github
          clientId: ${GITHUB_CLIENT_ID}
          redirectUri: ${GITHUB_REDIRECT_URI}
          scopes:
            - user:email
            - read:user
```

**.env**:
```bash
# API Configuration
API_BASE_URL=http://localhost:8000

# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

**.env.example** (committed to git):
```bash
# API Configuration
API_BASE_URL=http://localhost:8000

# Google OAuth
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# GitHub OAuth
# Get credentials from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
```

**.gitignore**:
```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Keep example file
!.env.example
```

## Migration Guide

If you have hardcoded credentials in your config file, here's how to migrate:

### Step 1: Identify Sensitive Values

Review your `config.yaml` and identify values that should be environment variables:

```yaml
# Before
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: 123456789.apps.googleusercontent.com  # Sensitive!
          redirectUri: http://localhost:8000/auth/callback
```

### Step 2: Create .env File

Create a `.env` file with your sensitive values:

```bash
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
```

### Step 3: Update config.yaml

Replace hardcoded values with environment variable references:

```yaml
# After
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: ${GOOGLE_REDIRECT_URI}
```

### Step 4: Create .env.example

Document the required variables:

```bash
# .env.example
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
```

### Step 5: Update .gitignore

Ensure `.env` is ignored:

```gitignore
.env
.env.local
```

### Step 6: Test

Run your application and verify environment variables are loaded correctly:

```bash
npx @uigen-dev/cli serve openapi.yaml
```

## Frequently Asked Questions

### Can I use environment variables for non-string values?

Environment variables are always strings. If you need a number or boolean, the value will be a string:

```yaml
# This works, but the value will be the string "8000"
apiPort: ${API_PORT}
```

For type-specific handling, process the value in your application code.

### Can I use default values?

Currently, UIGen does not support default values in the `${VAR:-default}` syntax. If a variable is not set, the application will fail with an error. This is intentional to prevent running with incomplete configuration.

### Can I escape the ${} syntax?

Currently, there is no escape mechanism. If you need a literal `${` in your config, this is not yet supported. This is a rare edge case that may be addressed in future versions.

### Do environment variables work in all config fields?

Yes, environment variables work in any string value at any depth in your config structure. They work in:
- Top-level document annotations
- Nested objects
- Array elements
- Operation-specific annotations
- Schema property annotations

### Can I reference one environment variable from another?

No, environment variable expansion happens only in the config file. You cannot reference one environment variable from another within the `.env` file. Use your shell or deployment platform for variable composition if needed.

### How do I use environment variables in CI/CD?

Set environment variables in your CI/CD platform:

**GitHub Actions**:
```yaml
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
  GOOGLE_REDIRECT_URI: ${{ secrets.GOOGLE_REDIRECT_URI }}
```

**GitLab CI**:
```yaml
variables:
  GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID
  GOOGLE_REDIRECT_URI: $GOOGLE_REDIRECT_URI
```

Store secrets in your platform's secrets management system.

## Related Documentation

- [Config Reconciliation](/docs/core-concepts/config-reconciliation) - How config files are processed
- [OAuth Configuration](/docs/authentication/oauth-configuration) - Setting up OAuth providers
- [CLI Reference](/docs/cli-reference/serve) - Command-line options

## Summary

Environment variables provide a secure, flexible way to manage sensitive configuration in UIGen applications. By using the `${ENV_VAR_NAME}` syntax in your config files, you can:

- Keep secrets out of version control
- Use different values across environments
- Share config files safely with your team
- Follow security best practices

**Key Takeaways**:
- Use `${ENV_VAR_NAME}` syntax in config.yaml
- Store sensitive values in `.env` (never commit this file)
- Create `.env.example` for documentation (commit this file)
- Environment variables work at any depth in your config
- Missing variables cause clear, immediate errors
- Follow security best practices for secrets management
