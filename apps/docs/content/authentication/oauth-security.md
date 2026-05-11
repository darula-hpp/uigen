---
title: OAuth Security Best Practices
description: Security guidelines and best practices for OAuth authentication in UIGen
order: 8
---

# OAuth Security Best Practices

This guide covers security best practices for implementing OAuth authentication in your UIGen application.

## State Parameter (CSRF Protection)

### What UIGen Does Automatically

UIGen automatically implements CSRF protection using the OAuth state parameter:

1. **Generation**: Creates a cryptographically secure random state (128-bit entropy)
2. **Storage**: Stores state in sessionStorage (browser-side, single-use)
3. **Validation**: Validates state on callback before exchanging code for token
4. **Cleanup**: Removes state after successful validation

### Why This Matters

The state parameter prevents Cross-Site Request Forgery (CSRF) attacks where an attacker tricks a user into authorizing their malicious application.

**Without state validation**:
```
Attacker → Victim clicks malicious link → Victim authorizes attacker's app → Attacker gains access
```

**With state validation**:
```
Attacker → Victim clicks malicious link → State mismatch → Authorization rejected ✓
```

## Token Storage

### Where Tokens Are Stored

UIGen stores OAuth tokens in browser localStorage:

| Token Type | Storage Location | Purpose |
|------------|------------------|---------|
| Access Token | localStorage | API authentication |
| Refresh Token | localStorage | Token renewal |
| State Parameter | sessionStorage | CSRF protection (temporary) |
| User Profile | localStorage | User information |

### Security Considerations

**localStorage Security**:
- ✅ Persists across browser sessions
- ✅ Isolated per origin (domain)
- ⚠️ Accessible to JavaScript (XSS risk)
- ⚠️ Not sent automatically with requests

**Mitigation Strategies**:
1. **Content Security Policy (CSP)**: Prevent XSS attacks
2. **HTTPS Only**: Protect tokens in transit
3. **Token Expiration**: Use short-lived access tokens
4. **Refresh Tokens**: Rotate tokens regularly

### Example CSP Header

```http
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
  connect-src 'self' https://api.yourdomain.com;
```

## HTTPS Requirements

### Development vs Production

**Development** (localhost):
- HTTP is acceptable: `http://localhost:3000/auth/callback`
- OAuth providers allow HTTP for localhost

**Production**:
- HTTPS is **required**: `https://yourdomain.com/auth/callback`
- Most providers reject HTTP redirect URIs in production
- Protects tokens from man-in-the-middle attacks

### Why HTTPS Matters

Without HTTPS:
- Tokens can be intercepted in transit
- Authorization codes can be stolen
- User credentials can be compromised

## Redirect URI Validation

### Best Practices

1. **Exact Match**: Redirect URI must match exactly (including trailing slashes)
2. **Whitelist Approach**: Register only necessary redirect URIs
3. **No Wildcards**: Avoid wildcard redirect URIs (most providers don't support them)
4. **Separate Environments**: Use different redirect URIs for dev/staging/production

### Common Mistakes

❌ **Bad**:
```yaml
redirectUri: http://example.com/auth/callback/  # Trailing slash
```

✅ **Good**:
```yaml
redirectUri: http://example.com/auth/callback   # No trailing slash
```

❌ **Bad**:
```yaml
redirectUri: http://*.example.com/auth/callback  # Wildcard
```

✅ **Good**:
```yaml
# Register each subdomain separately
redirectUri: https://app.example.com/auth/callback
```

## Scope Minimization

### Principle of Least Privilege

Only request the OAuth scopes your application actually needs.

❌ **Bad** (requesting unnecessary scopes):
```yaml
scopes:
  - openid
  - email
  - profile
  - read:user
  - repo              # Not needed
  - admin:org         # Not needed
  - delete:repo       # Dangerous!
```

✅ **Good** (minimal scopes):
```yaml
scopes:
  - openid
  - email
  - profile
```

### Why This Matters

- **User Trust**: Users are more likely to authorize apps requesting fewer permissions
- **Security**: Limits damage if tokens are compromised
- **Compliance**: Reduces data privacy concerns

## Token Lifecycle Management

### Access Token Expiration

Most OAuth providers issue short-lived access tokens (1-2 hours).

**UIGen Behavior**:
1. Detects 401 Unauthorized responses
2. Automatically attempts token refresh
3. Retries original request with new token
4. Redirects to login if refresh fails

### Refresh Token Rotation

Some providers rotate refresh tokens on each use:

```
Old Refresh Token → Token Refresh Request → New Access Token + New Refresh Token
```

UIGen automatically handles refresh token rotation.

### Token Revocation

Users can revoke access at any time through provider settings:

- **Google**: [Google Account Permissions](https://myaccount.google.com/permissions)
- **GitHub**: [Authorized OAuth Apps](https://github.com/settings/applications)
- **Microsoft**: [Account Privacy](https://account.microsoft.com/privacy)

**Your Application Should**:
- Handle 401 errors gracefully
- Redirect to login when tokens are invalid
- Clear stored tokens on logout

## Client Secret Management

### Public vs Confidential Clients

**Public Clients** (UIGen default):
- Client-side applications (browsers, mobile apps)
- Cannot securely store client secrets
- Use PKCE (Proof Key for Code Exchange) when available

**Confidential Clients**:
- Server-side applications
- Can securely store client secrets
- Use client secret for token exchange

### Never Expose Client Secrets

❌ **Never do this**:
```yaml
# DON'T: Hardcode secrets in OpenAPI spec
x-uigen-auth:
  providers:
    - provider: google
      clientId: "123456.apps.googleusercontent.com"
      clientSecret: "GOCSPX-abc123"  # NEVER DO THIS!
```

✅ **Do this instead**:
```yaml
# Use environment variables
x-uigen-auth:
  providers:
    - provider: google
      clientId: ${GOOGLE_CLIENT_ID}
      # No client secret needed for public OAuth flows
```

## XSS (Cross-Site Scripting) Prevention

### Content Security Policy

Implement a strict CSP to prevent XSS attacks:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline';">
```

### Input Sanitization

UIGen automatically sanitizes user inputs, but you should also:

1. **Validate API responses**: Don't trust data from OAuth providers
2. **Escape user-generated content**: Sanitize before displaying
3. **Use framework protections**: React automatically escapes JSX content

## Session Management

### Logout Best Practices

When users log out:

1. ✅ Clear access token from localStorage
2. ✅ Clear refresh token from localStorage
3. ✅ Clear user profile from localStorage
4. ✅ Clear auth method from localStorage
5. ✅ Redirect to login page
6. ⚠️ Consider revoking tokens with provider (optional)

UIGen handles steps 1-5 automatically.

### Session Timeout

Consider implementing session timeout for sensitive applications:

```typescript
// Example: 30-minute session timeout
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

let lastActivity = Date.now();

// Update on user activity
document.addEventListener('click', () => {
  lastActivity = Date.now();
});

// Check timeout periodically
setInterval(() => {
  if (Date.now() - lastActivity > SESSION_TIMEOUT) {
    // Log user out
    clearAuthCredentials();
    window.location.href = '/login';
  }
}, 60000); // Check every minute
```

## Rate Limiting

### Provider Rate Limits

OAuth providers enforce rate limits:

| Provider | Rate Limit | Scope |
|----------|------------|-------|
| Google | 10,000 requests/day | Per project |
| GitHub | 5,000 requests/hour | Per user |
| Microsoft | Varies by endpoint | Per app |

### Best Practices

1. **Cache user profiles**: Don't fetch on every request
2. **Implement exponential backoff**: Retry with increasing delays
3. **Monitor usage**: Track API calls to avoid limits
4. **Handle 429 responses**: Respect rate limit headers

## Monitoring and Logging

### What to Log

✅ **Do log**:
- Authentication attempts (success/failure)
- Token refresh attempts
- OAuth errors (with error codes)
- Unusual activity patterns

❌ **Never log**:
- Access tokens
- Refresh tokens
- Client secrets
- Authorization codes

### Example Logging

```typescript
// Good logging
console.log('[OAuth] Authentication successful', {
  provider: 'google',
  userId: 'user123',
  timestamp: new Date().toISOString()
});

// Bad logging - NEVER DO THIS
console.log('[OAuth] Token:', accessToken); // ❌ NEVER LOG TOKENS
```

## Compliance Considerations

### GDPR (EU)

If serving EU users:

1. **Consent**: Obtain explicit consent before OAuth
2. **Data Minimization**: Request minimal scopes
3. **Right to Deletion**: Implement account deletion
4. **Data Portability**: Allow users to export their data

### CCPA (California)

If serving California users:

1. **Privacy Policy**: Disclose data collection practices
2. **Opt-Out**: Provide opt-out mechanisms
3. **Data Access**: Allow users to access their data

## Security Checklist

Before deploying to production:

- [ ] HTTPS enabled for all OAuth redirect URIs
- [ ] State parameter validation implemented (automatic in UIGen)
- [ ] Minimal OAuth scopes requested
- [ ] Client secrets not exposed in client-side code
- [ ] Content Security Policy configured
- [ ] Token storage secured (localStorage with CSP)
- [ ] Session timeout implemented (if needed)
- [ ] Logout clears all tokens and user data
- [ ] Rate limiting handled gracefully
- [ ] Error logging implemented (without logging tokens)
- [ ] Privacy policy updated with OAuth data collection
- [ ] Terms of service updated
- [ ] OAuth app verified with providers (if required)

## Incident Response

### If Tokens Are Compromised

1. **Immediate Actions**:
   - Revoke compromised tokens with OAuth provider
   - Force logout all users
   - Rotate client secrets (if applicable)
   - Investigate breach source

2. **Communication**:
   - Notify affected users
   - Document incident
   - Report to authorities if required (GDPR, etc.)

3. **Prevention**:
   - Review security measures
   - Implement additional monitoring
   - Update security policies

## Next Steps

- [OAuth Troubleshooting](/docs/authentication/oauth-troubleshooting) - Common issues and solutions
- [Google OAuth Setup](/docs/authentication/oauth-google-setup) - Provider-specific setup
- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - Provider-specific setup

## Additional Resources

- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP OAuth Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [OAuth 2.0 Threat Model](https://datatracker.ietf.org/doc/html/rfc6819)
