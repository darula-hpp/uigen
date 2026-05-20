# Skill: Configure OAuth Authentication

## Overview
This skill guides AI agents through automatically detecting and configuring OAuth authentication in OpenAPI specifications. It adds the `x-uigen-auth` annotation to enable social login (Google, GitHub, Facebook, Microsoft) in UIGen applications.

## Critical Understanding

### What This Skill Does
Analyzes an OpenAPI spec and automatically configures OAuth authentication by:
- Detecting if the API needs OAuth (has auth endpoints but no OAuth configured)
- Prompting user for OAuth provider preferences
- Generating `x-uigen-auth` annotation with proper configuration
- Adding OAuth configuration to both OpenAPI spec and config.yaml
- Providing setup instructions for each selected provider

### OAuth Configuration Locations

**Option 1: OpenAPI Spec (Recommended)**
```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: https://myapp.com/auth/callback
        scopes:
          - openid
          - email
          - profile
```

**Option 2: Config.yaml**
```yaml
version: '1.0'
auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      redirectUri: https://myapp.com/auth/callback
      scopes:
        - openid
        - email
        - profile
```

## AI Agent Workflow

### Step 1: Detect Need for OAuth

Check if the API would benefit from OAuth:

**Indicators that OAuth is needed:**
- Has login endpoint (`POST /login`, `POST /auth/login`, etc.)
- Has user management endpoints (`/users`, `/profile`, `/me`)
- Has authentication but no OAuth configured yet
- User explicitly requests OAuth setup

**Skip OAuth if:**
- API is purely public (no auth endpoints)
- OAuth is already configured (`x-uigen-auth` exists)
- API uses API keys only (no user login)

### Step 2: Ask User for Provider Preferences

Use interactive prompts to gather OAuth configuration:

```typescript
// Prompt 1: Which providers?
"Which OAuth providers would you like to enable?"
Options:
  - Google (recommended for general apps)
  - GitHub (recommended for developer tools)
  - Facebook (recommended for social apps)
  - Microsoft (recommended for enterprise apps)
  - All of the above

// Prompt 2: Redirect URI
"What is your application's redirect URI?"
Default: "http://localhost:3000/auth/callback"
Help: "This is where users will be redirected after OAuth login. Use localhost for development."

// Prompt 3: Custom scopes (optional)
"Do you want to customize OAuth scopes? (default scopes will be used if not)"
Options:
  - Use default scopes (recommended)
  - Customize scopes
```

### Step 3: Generate OAuth Configuration

Based on user selections, generate the OAuth configuration:

**Default Scopes by Provider:**
- **Google**: `['openid', 'email', 'profile']`
- **GitHub**: `['read:user', 'user:email']`
- **Facebook**: `['email', 'public_profile']`
- **Microsoft**: `['openid', 'email', 'profile']`

**Configuration Template:**
```typescript
interface OAuthProvider {
  provider: 'google' | 'github' | 'facebook' | 'microsoft';
  clientId: string; // Always use environment variable
  redirectUri: string;
  scopes?: string[];
  enabled?: boolean;
  sessionValidationEndpoint?: string; // Optional: endpoint to validate existing sessions (e.g., /api/v1/auth/me)
}
```

### Step 4: Add Configuration to Spec

**Preferred Method: Add to OpenAPI spec info section**

```yaml
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        sessionValidationEndpoint: /api/v1/auth/me
        scopes:
          - openid
          - email
          - profile
      - provider: github
        clientId: ${GITHUB_CLIENT_ID}
        redirectUri: http://localhost:3000/auth/callback
        sessionValidationEndpoint: /api/v1/auth/me
        scopes:
          - read:user
          - user:email
```

**Alternative: Add to config.yaml**

If user prefers config.yaml or spec is read-only:

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: http://localhost:3000/auth/callback
          sessionValidationEndpoint: /api/v1/auth/me
          scopes:
            - openid
            - email
            - profile
```

### Step 5: Provide Setup Instructions

Generate provider-specific setup instructions:

```markdown
✓ OAuth configuration added successfully!

Next steps to complete OAuth setup:

## 1. Google OAuth Setup

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select existing project
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: http://localhost:3000/auth/callback
7. Copy the Client ID
8. Set environment variable: export GOOGLE_CLIENT_ID="your-client-id"

## 2. GitHub OAuth Setup

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: My App
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/auth/callback
4. Copy the Client ID
5. Set environment variable: export GITHUB_CLIENT_ID="your-client-id"

## Testing OAuth

1. Set environment variables for all providers
2. Run: uigen serve openapi.yaml
3. Navigate to the login page
4. Click on OAuth provider buttons to test login flow

## Documentation

For detailed setup guides, see:
- apps/docs/content/authentication/oauth-configuration.md
- apps/docs/content/authentication/oauth-{provider}-setup.md
```

## Detection Rules

### Rule 1: Detect OAuth Need

```typescript
function needsOAuth(spec: OpenAPISpec): boolean {
  // Check if OAuth already configured
  if (spec.info['x-uigen-auth']) {
    return false;
  }
  
  // Check for auth endpoints
  const hasLoginEndpoint = Object.entries(spec.paths).some(([path, methods]) =>
    /\/(login|signin|auth)/.test(path.toLowerCase()) &&
    methods.post
  );
  
  const hasUserEndpoints = Object.entries(spec.paths).some(([path]) =>
    /\/(users|profile|me|account)/.test(path.toLowerCase())
  );
  
  return hasLoginEndpoint || hasUserEndpoints;
}
```

### Rule 2: Detect Existing Auth Method

```typescript
function detectAuthMethod(spec: OpenAPISpec): string | null {
  // Check security schemes
  const securitySchemes = spec.components?.securitySchemes || {};
  
  for (const [name, scheme] of Object.entries(securitySchemes)) {
    if (scheme.type === 'oauth2') {
      return 'oauth2'; // Already has OAuth
    }
    if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      return 'bearer'; // Has JWT/token auth
    }
    if (scheme.type === 'apiKey') {
      return 'apiKey'; // Has API key auth
    }
  }
  
  return null;
}
```

### Rule 3: Suggest Providers Based on API Type

```typescript
function suggestProviders(spec: OpenAPISpec): string[] {
  const title = spec.info.title.toLowerCase();
  const description = spec.info.description?.toLowerCase() || '';
  const tags = Object.values(spec.paths)
    .flatMap(path => Object.values(path))
    .flatMap(op => op.tags || [])
    .map(tag => tag.toLowerCase());
  
  const allText = [title, description, ...tags].join(' ');
  
  const suggestions: string[] = [];
  
  // Developer tools → GitHub
  if (/developer|code|git|repository|api/.test(allText)) {
    suggestions.push('github');
  }
  
  // Social apps → Facebook
  if (/social|community|friend|post|share/.test(allText)) {
    suggestions.push('facebook');
  }
  
  // Enterprise apps → Microsoft
  if (/enterprise|business|corporate|office|microsoft/.test(allText)) {
    suggestions.push('microsoft');
  }
  
  // Always suggest Google as fallback
  if (!suggestions.includes('google')) {
    suggestions.unshift('google');
  }
  
  return suggestions;
}
```

## Provider Configuration Details

### Understanding OAuth Configuration Parameters

#### redirectUri (Required)
**Purpose**: Where the OAuth provider (Google, GitHub, etc.) redirects the user after authorization.

**Flow**:
1. User clicks "Sign in with Google"
2. SPA redirects to Google with `redirectUri=http://localhost:8000/api/v1/auth/oauth/google/callback`
3. User authorizes on Google
4. Google redirects to this URL with authorization code
5. Your backend receives the code and exchanges it for a token

**Important**: Must be registered in the OAuth provider's console and match exactly (including protocol and port).

#### sessionValidationEndpoint (Optional)
**Purpose**: Endpoint the SPA calls to check if a user has a valid session (cookie-based auth fallback).

**Flow**:
1. User lands on `/auth/callback` but has NO code/token in URL (e.g., page refresh)
2. SPA calls `sessionValidationEndpoint` (e.g., `/api/v1/auth/me`)
3. Backend checks if there's a valid session cookie
4. If valid, backend returns user data
5. SPA stores user info and redirects to dashboard

**When to use**: 
- Your backend uses cookie-based authentication alongside token-based auth
- You want to support session persistence across page refreshes
- You have a "get current user" endpoint that validates sessions

**Example**: If your API has a `GET /api/v1/auth/me` endpoint that returns the current user when authenticated via cookie, set:
```yaml
sessionValidationEndpoint: /api/v1/auth/me
```

**Note**: This is different from `redirectUri`:
- `redirectUri`: Where OAuth provider sends the user (backend endpoint)
- `sessionValidationEndpoint`: Where SPA checks existing sessions (backend endpoint)

### Google OAuth

```yaml
provider: google
clientId: ${GOOGLE_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
scopes:
  - openid      # Required for OpenID Connect
  - email       # Access user's email
  - profile     # Access user's basic profile info
sessionValidationEndpoint: /api/v1/auth/me  # Optional: endpoint to validate existing sessions
```

**Setup URL**: https://console.cloud.google.com/apis/credentials

**Session Validation Endpoint**: Optional endpoint that the SPA calls to check if a user has a valid session (cookie-based auth). This is used as a fallback when the OAuth callback doesn't have a token in the URL (e.g., page refresh, cookie-based authentication).

### GitHub OAuth

```yaml
provider: github
clientId: ${GITHUB_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
scopes:
  - read:user    # Read user profile data
  - user:email   # Access user's email addresses
```

**Setup URL**: https://github.com/settings/developers

### Facebook OAuth

```yaml
provider: facebook
clientId: ${FACEBOOK_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
scopes:
  - email           # Access user's email
  - public_profile  # Access user's public profile
```

**Setup URL**: https://developers.facebook.com/apps/

### Microsoft OAuth

```yaml
provider: microsoft
clientId: ${MICROSOFT_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
scopes:
  - openid      # Required for OpenID Connect
  - email       # Access user's email
  - profile     # Access user's profile
```

**Setup URL**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

## Advanced Configuration

### Custom OAuth Endpoints

For self-hosted or custom OAuth providers:

```yaml
provider: github  # Use as base type
clientId: ${GITLAB_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
authorizationUrl: https://gitlab.company.com/oauth/authorize
tokenUrl: https://gitlab.company.com/oauth/token
userInfoUrl: https://gitlab.company.com/api/v4/user
scopes:
  - read_user
  - email
```

### Multiple Environments

Development vs Production redirect URIs:

```yaml
# Development
provider: google
clientId: ${GOOGLE_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback

# Production (update before deploying)
provider: google
clientId: ${GOOGLE_CLIENT_ID}
redirectUri: https://myapp.com/auth/callback
```

### Disabling Providers

Temporarily disable a provider:

```yaml
provider: facebook
clientId: ${FACEBOOK_CLIENT_ID}
redirectUri: http://localhost:3000/auth/callback
enabled: false  # Provider will not appear in UI
```

## Implementation Example

```typescript
async function configureOAuth(specPath: string): Promise<void> {
  // Step 1: Load and parse spec
  const spec = await loadOpenAPISpec(specPath);
  
  // Step 2: Check if OAuth needed
  if (!needsOAuth(spec)) {
    console.log('OAuth not needed or already configured');
    return;
  }
  
  // Step 3: Suggest providers
  const suggested = suggestProviders(spec);
  
  // Step 4: Ask user for preferences
  const providers = await askUserForProviders(suggested);
  const redirectUri = await askUserForRedirectUri();
  const sessionValidationEndpoint = await askUserForSessionValidationEndpoint();
  const useCustomScopes = await askUserForCustomScopes();
  
  // Step 5: Generate configuration
  const oauthConfig = {
    providers: providers.map(provider => ({
      provider,
      clientId: `\${${provider.toUpperCase()}_CLIENT_ID}`,
      redirectUri,
      sessionValidationEndpoint,
      scopes: useCustomScopes 
        ? await askUserForScopes(provider)
        : getDefaultScopes(provider)
    }))
  };
  
  // Step 6: Add to spec
  spec.info['x-uigen-auth'] = oauthConfig;
  await writeOpenAPISpec(specPath, spec);
  
  // Step 7: Provide setup instructions
  printSetupInstructions(providers, redirectUri);
}

function getDefaultScopes(provider: string): string[] {
  const defaults = {
    google: ['openid', 'email', 'profile'],
    github: ['read:user', 'user:email'],
    facebook: ['email', 'public_profile'],
    microsoft: ['openid', 'email', 'profile']
  };
  
  return defaults[provider] || [];
}

function printSetupInstructions(providers: string[], redirectUri: string): void {
  console.log('\n✓ OAuth configuration added successfully!\n');
  console.log('Next steps to complete OAuth setup:\n');
  
  providers.forEach((provider, index) => {
    console.log(`## ${index + 1}. ${capitalize(provider)} OAuth Setup\n`);
    console.log(getProviderInstructions(provider, redirectUri));
    console.log('');
  });
  
  console.log('## Testing OAuth\n');
  console.log('1. Set environment variables for all providers');
  console.log('2. Run: uigen serve openapi.yaml');
  console.log('3. Navigate to the login page');
  console.log('4. Click on OAuth provider buttons to test login flow\n');
}
```

## User Interaction Flow

```
AI: I noticed your API has authentication endpoints. Would you like to add OAuth social login?

User: Yes

AI: Which OAuth providers would you like to enable?
    1. Google (recommended for general apps)
    2. GitHub (recommended for developer tools)
    3. Facebook (recommended for social apps)
    4. Microsoft (recommended for enterprise apps)
    5. All of the above

User: 1 and 2

AI: What is your application's redirect URI?
    (Default: http://localhost:3000/auth/callback)

User: [Enter] (uses default)

AI: Do you have a session validation endpoint for cookie-based auth?
    (Optional: e.g., /api/v1/auth/me or /api/v1/users/me)
    Leave blank if you only use token-based auth.

User: /api/v1/auth/me

AI: Do you want to customize OAuth scopes?
    1. Use default scopes (recommended)
    2. Customize scopes

User: 1

AI: ✓ OAuth configuration added successfully!

    Next steps to complete OAuth setup:

    ## 1. Google OAuth Setup
    [detailed instructions]

    ## 2. GitHub OAuth Setup
    [detailed instructions]

    ## Testing OAuth
    [testing instructions]
```

## Integration with Auto-Annotate

The OAuth skill can be invoked as part of the auto-annotate workflow:

```typescript
// In auto-annotate.md workflow
async function autoAnnotate(specPath: string): Promise<void> {
  // ... existing auto-annotation logic ...
  
  // Check if OAuth should be configured
  if (needsOAuth(spec) && !spec.info['x-uigen-auth']) {
    console.log('\n💡 Tip: Your API could benefit from OAuth authentication.');
    console.log('   Run the OAuth configuration skill to set it up.\n');
  }
}
```

## Best Practices

### 1. Always Use Environment Variables

```yaml
# Good
clientId: ${GOOGLE_CLIENT_ID}

# Bad - Never hardcode client IDs
clientId: "123456789-abc.apps.googleusercontent.com"
```

### 2. Start with Localhost for Development

```yaml
# Development
redirectUri: http://localhost:3000/auth/callback

# Update for production
redirectUri: https://myapp.com/auth/callback
```

### 3. Use Minimal Scopes

Only request scopes you actually need:

```yaml
# Good - minimal scopes
scopes:
  - openid
  - email

# Avoid - unnecessary scopes
scopes:
  - openid
  - email
  - profile
  - contacts
  - calendar
```

### 4. Document Environment Variables

Create a `.env.example` file:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
FACEBOOK_CLIENT_ID=your-facebook-client-id
MICROSOFT_CLIENT_ID=your-microsoft-client-id
```

## Testing OAuth Configuration

### 1. Verify Configuration

```bash
# Check if x-uigen-auth is present
grep -A 10 "x-uigen-auth" openapi.yaml
```

### 2. Test with UIGen

```bash
# Set environment variables
export GOOGLE_CLIENT_ID="your-client-id"
export GITHUB_CLIENT_ID="your-client-id"

# Start UIGen
uigen serve openapi.yaml
```

### 3. Verify OAuth Buttons

- Navigate to login page
- Verify OAuth buttons appear for each configured provider
- Verify buttons have correct styling and logos
- Click buttons to test OAuth flow (requires valid client IDs)

## Troubleshooting

### Issue: OAuth buttons not appearing

**Check:**
1. Is `x-uigen-auth` present in spec or config.yaml?
2. Are providers enabled (not `enabled: false`)?
3. Is UIGen version up to date?

### Issue: OAuth redirect fails

**Check:**
1. Is redirect URI correct in OAuth provider console?
2. Does redirect URI match exactly (including protocol and port)?
3. Are environment variables set correctly?

### Issue: Scope errors

**Check:**
1. Are requested scopes valid for the provider?
2. Are scopes enabled in OAuth provider console?
3. Are scopes formatted correctly (array of strings)?

## Documentation References

For detailed information, refer to:
- `apps/docs/content/authentication/oauth-configuration.md` - Complete OAuth configuration guide
- `apps/docs/content/authentication/oauth-google-setup.md` - Google OAuth setup
- `apps/docs/content/authentication/oauth-github-setup.md` - GitHub OAuth setup
- `apps/docs/content/authentication/oauth-facebook-setup.md` - Facebook OAuth setup
- `apps/docs/content/authentication/oauth-microsoft-setup.md` - Microsoft OAuth setup
- `apps/docs/content/authentication/oauth-security.md` - Security best practices
- `apps/docs/content/authentication/oauth-troubleshooting.md` - Troubleshooting guide

## Conclusion

As an AI agent, your role is to:

1. **Detect** if the API needs OAuth authentication
2. **Prompt** user for OAuth provider preferences
3. **Generate** proper OAuth configuration
4. **Add** configuration to OpenAPI spec or config.yaml
5. **Provide** detailed setup instructions for each provider

This skill focuses exclusively on OAuth configuration, keeping it separate from general auto-annotation logic for better maintainability and user experience.
