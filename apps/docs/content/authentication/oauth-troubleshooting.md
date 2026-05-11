---
title: OAuth Troubleshooting
description: Common OAuth authentication issues and solutions
order: 9
---

# OAuth Troubleshooting

This guide covers common OAuth authentication issues and their solutions across all supported providers (Google, GitHub, Facebook, Microsoft).

## Quick Diagnosis

Use this flowchart to quickly identify your issue:

```
Error during login? → See "Authorization Errors"
Error after callback? → See "Callback Errors"
Token issues? → See "Token Management Errors"
Configuration issues? → See "Configuration Errors"
User experience issues? → See "User Experience Issues"
```

## Authorization Errors

### redirect_uri_mismatch

**Symptoms**:
- Error message: "redirect_uri_mismatch" or "The redirect URI specified in the request does not match"
- User cannot complete OAuth flow

**Causes**:
- Redirect URI in OpenAPI spec doesn't match provider configuration
- Protocol mismatch (http vs https)
- Trailing slash mismatch
- Domain mismatch

**Solutions**:

1. **Check exact match**:
   ```yaml
   # Your OpenAPI spec
   redirectUri: http://localhost:3000/auth/callback
   
   # Must exactly match provider console
   # ✅ Correct: http://localhost:3000/auth/callback
   # ❌ Wrong: http://localhost:3000/auth/callback/  (trailing slash)
   # ❌ Wrong: https://localhost:3000/auth/callback  (protocol)
   ```

2. **Verify in provider console**:
   - **Google**: Cloud Console > Credentials > OAuth 2.0 Client IDs
   - **GitHub**: Settings > Developer settings > OAuth Apps
   - **Facebook**: App Dashboard > Facebook Login > Settings
   - **Microsoft**: Azure Portal > App registrations > Authentication

3. **Common mistakes**:
   - Trailing slashes: `http://example.com/auth/callback/` vs `http://example.com/auth/callback`
   - Protocol: `http://` vs `https://`
   - Port numbers: `http://localhost:3000` vs `http://localhost`
   - Subdomain: `app.example.com` vs `example.com`

### access_denied

**Symptoms**:
- Error message: "access_denied" or "User denied access"
- User is redirected back to login page

**Causes**:
- User clicked "Cancel" or "Deny" on provider consent screen
- User closed the authorization window

**Solutions**:
1. This is expected behavior when users decline authorization
2. Display a friendly message: "Authorization was cancelled. Please try again."
3. Allow user to retry the OAuth flow
4. Consider explaining why permissions are needed

**UIGen Behavior**:
UIGen automatically handles this error and displays a user-friendly message.

### invalid_client

**Symptoms**:
- Error message: "invalid_client" or "Client authentication failed"
- Authorization fails immediately

**Causes**:
- Incorrect client ID
- Client ID not set in environment variables
- OAuth app deleted or disabled in provider console

**Solutions**:

1. **Verify client ID**:
   ```bash
   # Check environment variable is set
   echo $GOOGLE_CLIENT_ID
   echo $GITHUB_CLIENT_ID
   echo $FACEBOOK_CLIENT_ID
   echo $MICROSOFT_CLIENT_ID
   ```

2. **Check for whitespace**:
   ```bash
   # Remove any extra whitespace
   export GOOGLE_CLIENT_ID="123456.apps.googleusercontent.com"
   # Not: export GOOGLE_CLIENT_ID=" 123456.apps.googleusercontent.com "
   ```

3. **Verify in provider console**:
   - Ensure OAuth app still exists
   - Check that app is not disabled
   - Confirm you're using the correct client ID (not client secret)

### invalid_scope

**Symptoms**:
- Error message: "invalid_scope" or "The requested scope is invalid"
- Authorization fails with scope error

**Causes**:
- Requesting scopes not supported by provider
- Typo in scope name
- Requesting scopes that require app review (Facebook)

**Solutions**:

1. **Use default scopes**:
   ```yaml
   # Let UIGen use provider defaults
   x-uigen-auth:
     providers:
       - provider: google
         clientId: ${GOOGLE_CLIENT_ID}
         redirectUri: ${REDIRECT_URI}
         # scopes omitted - uses defaults
   ```

2. **Check scope names**:
   ```yaml
   # Google
   scopes:
     - openid
     - email
     - profile
   
   # GitHub
   scopes:
     - read:user
     - user:email
   
   # Facebook
   scopes:
     - email
     - public_profile
   
   # Microsoft
   scopes:
     - openid
     - email
     - profile
   ```

3. **Facebook app review**:
   - Scopes beyond `email` and `public_profile` require app review
   - Submit app for review or use default scopes

## Callback Errors

### State Mismatch

**Symptoms**:
- Error message: "State parameter mismatch" or "Invalid state"
- User redirected back to login after authorization

**Causes**:
- CSRF protection triggered
- Browser cleared sessionStorage during OAuth flow
- Browser extension interfering with sessionStorage
- User opened callback URL directly

**Solutions**:

1. **Clear browser storage and retry**:
   ```javascript
   // In browser console
   sessionStorage.clear();
   localStorage.clear();
   ```

2. **Check browser extensions**:
   - Disable privacy/security extensions temporarily
   - Try in incognito/private mode

3. **Verify sessionStorage works**:
   ```javascript
   // In browser console
   sessionStorage.setItem('test', 'value');
   console.log(sessionStorage.getItem('test')); // Should print 'value'
   ```

4. **Don't bookmark callback URLs**:
   - Callback URLs are single-use
   - Always start OAuth flow from login page

### Token Exchange Failed

**Symptoms**:
- Error message: "Failed to exchange authorization code for token"
- User authorized but not logged in

**Causes**:
- Authorization code expired (codes expire in 10 minutes)
- Authorization code already used
- Network timeout during token exchange
- Provider token endpoint unavailable

**Solutions**:

1. **Retry the OAuth flow**:
   - Authorization codes are single-use
   - Start from login page again

2. **Check network connectivity**:
   ```bash
   # Test provider token endpoint
   curl -I https://oauth2.googleapis.com/token  # Google
   curl -I https://github.com/login/oauth/access_token  # GitHub
   ```

3. **Check for duplicate requests**:
   - Ensure your app doesn't make multiple token exchange requests
   - UIGen handles this automatically

4. **Increase timeout** (if using custom implementation):
   - Default timeout is 30 seconds
   - Increase if network is slow

### bad_verification_code (GitHub)

**Symptoms**:
- Error message: "bad_verification_code"
- GitHub-specific error after callback

**Causes**:
- Authorization code expired
- Authorization code already used
- Code was tampered with

**Solutions**:
1. Start OAuth flow again from login page
2. Ensure code is not being logged or exposed
3. Check that callback handler runs only once

## Token Management Errors

### Token Expired

**Symptoms**:
- API requests return 401 Unauthorized
- User logged out unexpectedly

**Causes**:
- Access token expired (typically 1-2 hours)
- Refresh token expired or revoked
- User revoked app access in provider settings

**Solutions**:

**UIGen automatically handles token refresh**:
1. Detects 401 responses
2. Attempts to refresh access token
3. Retries original request
4. Redirects to login if refresh fails

**Manual check**:
```javascript
// In browser console
console.log(localStorage.getItem('access_token'));
console.log(localStorage.getItem('refresh_token'));
```

**If tokens are missing**:
- User needs to log in again
- Check that logout didn't clear tokens unintentionally

### Refresh Token Invalid

**Symptoms**:
- Token refresh fails
- User redirected to login after 401 error

**Causes**:
- Refresh token expired (typically 90 days for Microsoft, varies by provider)
- User revoked app access
- Refresh token was rotated and old token used

**Solutions**:
1. This is expected behavior - user needs to re-authenticate
2. Display message: "Your session has expired. Please log in again."
3. Redirect to login page (UIGen does this automatically)

### User Revoked Access

**Symptoms**:
- API requests fail with 401
- Token refresh fails

**Causes**:
- User revoked app access in provider settings:
  - **Google**: [Account Permissions](https://myaccount.google.com/permissions)
  - **GitHub**: [Authorized OAuth Apps](https://github.com/settings/applications)
  - **Facebook**: [Apps and Websites](https://www.facebook.com/settings?tab=applications)
  - **Microsoft**: [Account Privacy](https://account.microsoft.com/privacy)

**Solutions**:
1. This is expected and user-controlled
2. Clear stored tokens and redirect to login
3. User can re-authorize if they want

## Configuration Errors

### Environment Variables Not Set

**Symptoms**:
- Error message: "Client ID is required"
- OAuth buttons don't appear
- Server fails to start

**Causes**:
- Environment variables not set
- Typo in environment variable name
- Environment variables not loaded

**Solutions**:

1. **Check environment variables**:
   ```bash
   # List all OAuth-related variables
   env | grep -i oauth
   env | grep -i google
   env | grep -i github
   env | grep -i facebook
   env | grep -i microsoft
   ```

2. **Set environment variables**:
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id"
   export GITHUB_CLIENT_ID="your-client-id"
   export FACEBOOK_CLIENT_ID="your-client-id"
   export MICROSOFT_CLIENT_ID="your-client-id"
   export OAUTH_REDIRECT_URI="http://localhost:3000/auth/callback"
   ```

3. **Use .env file**:
   ```bash
   # Create .env file
   cat > .env << EOF
   GOOGLE_CLIENT_ID=your-client-id
   GITHUB_CLIENT_ID=your-client-id
   OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
   EOF
   
   # Load .env file
   source .env
   ```

4. **Verify in OpenAPI spec**:
   ```yaml
   x-uigen-auth:
     providers:
       - provider: google
         clientId: ${GOOGLE_CLIENT_ID}  # Correct syntax
         # Not: clientId: $GOOGLE_CLIENT_ID  # Missing braces
   ```

### Invalid OpenAPI Configuration

**Symptoms**:
- Server fails to start
- Validation errors in console
- OAuth buttons don't appear

**Causes**:
- Invalid provider name
- Missing required fields
- Invalid URL format
- Too many providers (max 10)

**Solutions**:

1. **Check provider name**:
   ```yaml
   # ✅ Correct
   provider: google
   provider: github
   provider: facebook
   provider: microsoft
   
   # ❌ Wrong
   provider: Google  # Case-sensitive
   provider: gmail   # Not a valid provider
   ```

2. **Check required fields**:
   ```yaml
   # All required fields
   x-uigen-auth:
     providers:
       - provider: google        # Required
         clientId: ${CLIENT_ID}  # Required
         redirectUri: ${REDIRECT_URI}  # Required
         scopes:                 # Optional
           - openid
           - email
   ```

3. **Check URL format**:
   ```yaml
   # ✅ Correct
   redirectUri: http://localhost:3000/auth/callback
   redirectUri: https://yourdomain.com/auth/callback
   
   # ❌ Wrong
   redirectUri: localhost:3000/auth/callback  # Missing protocol
   redirectUri: http://yourdomain.com/callback  # Wrong path
   ```

4. **Check provider limit**:
   ```yaml
   # Maximum 10 providers
   x-uigen-auth:
     providers:
       - provider: google
       - provider: github
       # ... up to 10 total
   ```

### HTTPS Required Error

**Symptoms**:
- Error message: "HTTPS is required for production"
- Custom OAuth URLs rejected

**Causes**:
- Using HTTP for custom OAuth endpoints
- Production deployment without HTTPS

**Solutions**:

1. **Development (localhost)**:
   ```yaml
   # HTTP is allowed for localhost
   redirectUri: http://localhost:3000/auth/callback
   ```

2. **Production**:
   ```yaml
   # HTTPS is required
   redirectUri: https://yourdomain.com/auth/callback
   ```

3. **Custom endpoints**:
   ```yaml
   # Custom endpoints must use HTTPS
   authorizationUrl: https://custom.provider.com/oauth/authorize
   tokenUrl: https://custom.provider.com/oauth/token
   ```

## User Experience Issues

### OAuth Buttons Not Appearing

**Symptoms**:
- Login page shows only credential form
- No OAuth buttons visible

**Causes**:
- OAuth providers not configured
- All providers disabled
- Environment variables not set
- Configuration validation failed

**Solutions**:

1. **Check configuration**:
   ```yaml
   # Ensure providers are configured
   x-uigen-auth:
     providers:
       - provider: google
         clientId: ${GOOGLE_CLIENT_ID}
         redirectUri: ${REDIRECT_URI}
         enabled: true  # Default is true
   ```

2. **Check browser console**:
   - Open browser developer tools
   - Look for configuration errors
   - Check network tab for failed requests

3. **Verify environment variables**:
   ```bash
   echo $GOOGLE_CLIENT_ID
   # Should print your client ID
   ```

### Email Not Returned

**Symptoms**:
- User profile missing email address
- Email field is null or undefined

**Causes**:
- Email scope not requested
- User doesn't have verified email
- User denied email permission
- Provider doesn't return email

**Solutions**:

1. **Request email scope**:
   ```yaml
   scopes:
     - email  # Explicitly request email
     - profile
   ```

2. **Check user's email status**:
   - **Google**: User must have verified email
   - **GitHub**: User must have verified email and made it public or granted access
   - **Facebook**: User must have verified email
   - **Microsoft**: Usually available for work/school accounts

3. **Handle missing email gracefully**:
   ```typescript
   // Your application should handle missing email
   const email = userProfile.email || 'No email provided';
   ```

### Slow OAuth Flow

**Symptoms**:
- OAuth flow takes a long time
- Timeout errors
- Poor user experience

**Causes**:
- Slow network connection
- Provider API slow or unavailable
- Too many API requests

**Solutions**:

1. **Check network**:
   ```bash
   # Test provider endpoints
   time curl -I https://accounts.google.com
   time curl -I https://github.com/login
   ```

2. **Implement loading indicators**:
   - UIGen shows loading spinners automatically
   - Inform users that authentication is in progress

3. **Cache user profiles**:
   - Don't fetch profile on every request
   - UIGen caches profiles in localStorage

4. **Monitor provider status**:
   - [Google Cloud Status](https://status.cloud.google.com/)
   - [GitHub Status](https://www.githubstatus.com/)
   - [Facebook Platform Status](https://developers.facebook.com/status/)
   - [Microsoft Azure Status](https://status.azure.com/)

## Provider-Specific Issues

### Google: "This app isn't verified"

**Problem**: Google shows warning that app isn't verified.

**Solution**:
- **Development**: Click "Advanced" > "Go to [Your App] (unsafe)"
- **Production**: Submit app for [OAuth verification](https://support.google.com/cloud/answer/9110914)

### GitHub: Rate Limiting

**Problem**: Too many requests to GitHub API.

**Solution**:
- GitHub limits: 5,000 requests/hour per user
- Cache user profile data
- Consider using GitHub App for higher limits

### Facebook: App in Development Mode

**Problem**: Only test users can log in.

**Solution**:
- Add users as testers in **Roles** > **Testers**
- Or complete app review and switch to Live Mode

### Microsoft: Admin Consent Required

**Problem**: "The grant requires admin permission"

**Solution**:
- Some permissions require admin consent in organizations
- Contact organization admin
- Or request only permissions that don't require admin consent

## Debugging Tips

### Enable Verbose Logging

```javascript
// In browser console
localStorage.setItem('debug', 'oauth:*');
// Reload page to see detailed OAuth logs
```

### Check Browser Storage

```javascript
// In browser console
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
console.log('Auth Method:', localStorage.getItem('auth_method'));
console.log('User Profile:', localStorage.getItem('oauth_user_profile'));
console.log('OAuth State:', sessionStorage.getItem('oauth_state_google'));
```

### Test OAuth Flow Manually

1. **Get authorization URL**:
   ```javascript
   // In browser console (on login page)
   // Click OAuth button and copy the redirect URL
   ```

2. **Check callback parameters**:
   ```javascript
   // In browser console (on callback page)
   const params = new URLSearchParams(window.location.search);
   console.log('Code:', params.get('code'));
   console.log('State:', params.get('state'));
   console.log('Error:', params.get('error'));
   ```

3. **Verify token exchange**:
   - Check browser network tab
   - Look for POST request to token endpoint
   - Check response for access_token

### Clear All OAuth Data

```javascript
// In browser console
// Clear all OAuth-related data
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('auth_method');
localStorage.removeItem('oauth_user_profile');
sessionStorage.clear();
// Reload page
location.reload();
```

## Getting Help

If you're still experiencing issues:

1. **Check documentation**:
   - [OAuth Configuration](/docs/authentication/oauth-configuration)
   - [Provider Setup Guides](/docs/authentication/oauth-google-setup)
   - [Security Best Practices](/docs/authentication/oauth-security)

2. **Check provider documentation**:
   - [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
   - [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps)
   - [Facebook Login](https://developers.facebook.com/docs/facebook-login)
   - [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)

3. **Check provider status pages**:
   - Verify provider services are operational
   - Check for ongoing incidents

4. **Report an issue**:
   - Include error messages
   - Include browser console logs
   - Include network tab screenshots
   - Include your OpenAPI configuration (remove sensitive data)

## Next Steps

- [OAuth Configuration](/docs/authentication/oauth-configuration) - Configure OAuth providers
- [OAuth Security Best Practices](/docs/authentication/oauth-security) - Learn about OAuth security
- [Google OAuth Setup](/docs/authentication/oauth-google-setup) - Set up Google OAuth
- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - Set up GitHub OAuth
