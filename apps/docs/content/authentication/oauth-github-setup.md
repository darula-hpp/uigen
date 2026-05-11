---
title: GitHub OAuth Setup
description: Step-by-step guide to configure GitHub OAuth for your UIGen application
order: 5
---

# GitHub OAuth Setup

This guide walks you through setting up GitHub OAuth authentication for your UIGen application.

## Prerequisites

- A GitHub account
- Your UIGen application's redirect URI (e.g., `http://localhost:3000/auth/callback` for development)

## Step 1: Create a GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/profile)
2. In the left sidebar, click **Developer settings**
3. Click **OAuth Apps**
4. Click **New OAuth App** (or **Register a new application**)

## Step 2: Configure Your OAuth App

Fill in the application details:

**Application name**:
- Enter your application name (e.g., "My UIGen App")
- This name will be shown to users during authorization

**Homepage URL**:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

**Application description** (Optional):
- Brief description of your application
- Shown to users during authorization

**Authorization callback URL**:
- Development: `http://localhost:3000/auth/callback`
- Production: `https://yourdomain.com/auth/callback`
- **Important**: This must match exactly with your UIGen configuration

Click **Register application**

## Step 3: Get Your Credentials

After registration, you'll see your OAuth app details:

1. **Client ID**: Copy this value - you'll need it for UIGen configuration
2. Click **Generate a new client secret**
3. **Client Secret**: Copy this value immediately (you won't be able to see it again)
   - **Note**: For UIGen, you typically don't need the client secret for public OAuth flows

## Step 4: Configure UIGen

Add the GitHub OAuth provider to your OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: github
        clientId: ${GITHUB_CLIENT_ID}
        redirectUri: ${GITHUB_REDIRECT_URI}
        scopes:
          - read:user
          - user:email
```

## Step 5: Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export GITHUB_CLIENT_ID="Iv1.1234567890abcdef"
export GITHUB_REDIRECT_URI="http://localhost:3000/auth/callback"
```

## Step 6: Test Your Integration

1. Start your UIGen application:
   ```bash
   npx @uigen-dev/cli serve openapi.yaml
   ```

2. Navigate to `http://localhost:3000`
3. Click the **Continue with GitHub** button
4. You should be redirected to GitHub's authorization page
5. Click **Authorize [Your App Name]**
6. You should be redirected back to your application and logged in

## Scopes Explained

### Default Scopes

UIGen requests these scopes by default:

| Scope | Description | Data Accessed |
|-------|-------------|---------------|
| `read:user` | Read user profile data | Public and private profile information |
| `user:email` | Access user email addresses | Primary and verified email addresses |

### Additional Scopes

You can request additional scopes if needed:

| Scope | Description | Use Case |
|-------|-------------|----------|
| `user` | Full user profile access | When you need write access to profile |
| `repo` | Repository access | Repository integration features |
| `public_repo` | Public repository access | Public repository integration |
| `gist` | Gist access | Gist integration features |
| `read:org` | Read organization data | Organization membership info |

See [GitHub OAuth Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps) for a complete list.

## Production Checklist

Before deploying to production:

- [ ] Update callback URL to your production domain
- [ ] Update homepage URL to your production domain
- [ ] Store client ID securely (environment variables, secrets manager)
- [ ] Never commit client secrets to version control
- [ ] Enable HTTPS for your production domain
- [ ] Test the complete OAuth flow in production
- [ ] Consider using a GitHub App instead of OAuth App for enhanced features

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The callback URL doesn't match what's configured in GitHub.

**Solution**:
1. Check that the redirect URI in your OpenAPI spec exactly matches the one in GitHub OAuth App settings
2. Ensure there are no trailing slashes
3. Verify protocol (http vs https) matches
4. GitHub OAuth Apps support only one callback URL - ensure you're using the correct one

### "The redirect_uri MUST match the registered callback URL for this application"

**Problem**: Callback URL mismatch or not registered.

**Solution**:
1. Go to your OAuth App settings on GitHub
2. Update the **Authorization callback URL** to match your configuration
3. Save changes and try again

### "access_denied" Error

**Problem**: User clicked "Cancel" or denied authorization.

**Solution**: This is expected behavior. The user can try logging in again.

### "bad_verification_code" Error

**Problem**: The authorization code has expired or been used already.

**Solution**:
1. Authorization codes are single-use and expire quickly
2. User should try the login flow again
3. Check that your application isn't making duplicate token exchange requests

### Email Not Returned

**Problem**: User's email is not included in the profile data.

**Solution**:
1. Ensure you're requesting the `user:email` scope
2. User must have a verified email address on GitHub
3. User must have made their email address public or granted email access

### Rate Limiting

**Problem**: Too many requests to GitHub API.

**Solution**:
1. GitHub has rate limits for OAuth apps (5,000 requests per hour per user)
2. Implement caching for user profile data
3. Consider using a GitHub App for higher rate limits

## GitHub OAuth vs GitHub Apps

### OAuth Apps
- Simpler to set up
- User-to-server authentication
- Limited to user permissions
- 5,000 requests/hour per user

### GitHub Apps
- More complex setup
- Server-to-server authentication
- Fine-grained permissions
- 5,000 requests/hour per installation
- Can act on behalf of the app or users
- Recommended for production applications

For most UIGen applications, OAuth Apps are sufficient. Consider GitHub Apps if you need:
- Higher rate limits
- Fine-grained repository permissions
- Webhook events
- Installation-based access

## Security Best Practices

1. **Never expose client secrets**: Keep client secrets server-side only
2. **Use HTTPS in production**: Always use HTTPS for production callback URLs
3. **Validate state parameter**: UIGen automatically validates the state parameter for CSRF protection
4. **Request minimum scopes**: Only request the scopes your application actually needs
5. **Rotate credentials**: Periodically regenerate client secrets
6. **Monitor access**: Regularly review authorized applications in GitHub settings

## Managing Multiple Environments

For development, staging, and production environments:

### Option 1: Multiple OAuth Apps

Create separate OAuth Apps for each environment:
- `My App (Development)` - `http://localhost:3000/auth/callback`
- `My App (Staging)` - `https://staging.yourdomain.com/auth/callback`
- `My App (Production)` - `https://yourdomain.com/auth/callback`

### Option 2: Dynamic Callback URLs

GitHub OAuth Apps support only one callback URL, so you'll need separate apps for different domains.

## User Experience Tips

1. **Clear app name**: Use a descriptive name that users will recognize
2. **Add app logo**: Upload a logo in your OAuth App settings for better branding
3. **Provide description**: Help users understand what your app does
4. **Request minimal scopes**: Users are more likely to authorize apps that request fewer permissions

## Next Steps

- [Microsoft OAuth Setup](/docs/authentication/oauth-microsoft-setup) - Set up Microsoft OAuth
- [OAuth Security Best Practices](/docs/authentication/oauth-security) - Learn about OAuth security
- [OAuth Troubleshooting](/docs/authentication/oauth-troubleshooting) - Common issues and solutions

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub OAuth Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub Apps vs OAuth Apps](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
