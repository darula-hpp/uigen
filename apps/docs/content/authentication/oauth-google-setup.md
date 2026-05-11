---
title: Google OAuth Setup
description: Step-by-step guide to configure Google OAuth for your UIGen application
order: 4
---

# Google OAuth Setup

This guide walks you through setting up Google OAuth authentication for your UIGen application.

## Prerequisites

- A Google account
- Your UIGen application's redirect URI (e.g., `http://localhost:3000/auth/callback` for development)

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** in the top navigation
3. Click **NEW PROJECT**
4. Enter a project name (e.g., "My UIGen App")
5. Click **CREATE**

## Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on **Google+ API**
4. Click **ENABLE**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace account)
3. Click **CREATE**

### Fill in the required fields:

**App information**:
- **App name**: Your application name (e.g., "My UIGen App")
- **User support email**: Your email address
- **App logo**: (Optional) Upload your app logo

**App domain** (Optional):
- **Application home page**: Your app's homepage URL
- **Application privacy policy link**: Your privacy policy URL
- **Application terms of service link**: Your terms of service URL

**Developer contact information**:
- **Email addresses**: Your email address

4. Click **SAVE AND CONTINUE**

### Configure scopes:

5. Click **ADD OR REMOVE SCOPES**
6. Select the following scopes:
   - `.../auth/userinfo.email` - View your email address
   - `.../auth/userinfo.profile` - See your personal info
   - `openid` - Associate you with your personal info on Google
7. Click **UPDATE**
8. Click **SAVE AND CONTINUE**

### Add test users (for development):

9. Click **ADD USERS**
10. Enter email addresses of users who can test your app
11. Click **ADD**
12. Click **SAVE AND CONTINUE**

13. Review the summary and click **BACK TO DASHBOARD**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter a **Name** (e.g., "UIGen Web Client")

### Configure authorized redirect URIs:

5. Under **Authorized redirect URIs**, click **ADD URI**
6. Add your redirect URIs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

7. Click **CREATE**

### Save your credentials:

8. A dialog will appear with your **Client ID** and **Client secret**
9. **Copy the Client ID** - you'll need this for your UIGen configuration
10. Click **OK**

## Step 5: Configure UIGen

Add the Google OAuth provider to your OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: ${GOOGLE_REDIRECT_URI}
        scopes:
          - openid
          - email
          - profile
```

## Step 6: Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export GOOGLE_CLIENT_ID="123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com"
export GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"
```

## Step 7: Test Your Integration

1. Start your UIGen application:
   ```bash
   npx @uigen-dev/cli serve openapi.yaml
   ```

2. Navigate to `http://localhost:3000`
3. Click the **Continue with Google** button
4. You should be redirected to Google's login page
5. Sign in with a test user account
6. Grant the requested permissions
7. You should be redirected back to your application and logged in

## Scopes Explained

### Default Scopes

UIGen requests these scopes by default:

| Scope | Description | Data Accessed |
|-------|-------------|---------------|
| `openid` | OpenID Connect authentication | User's unique Google ID |
| `email` | Email address | User's primary email address |
| `profile` | Basic profile information | Name, profile picture |

### Additional Scopes

You can request additional scopes if needed:

| Scope | Description | Use Case |
|-------|-------------|----------|
| `https://www.googleapis.com/auth/userinfo.email` | Email address (explicit) | When you need guaranteed email access |
| `https://www.googleapis.com/auth/userinfo.profile` | Profile info (explicit) | When you need guaranteed profile access |
| `https://www.googleapis.com/auth/calendar.readonly` | Read calendar events | Calendar integration |
| `https://www.googleapis.com/auth/drive.readonly` | Read Google Drive files | Drive integration |

See [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes) for a complete list.

## Production Checklist

Before deploying to production:

- [ ] Update redirect URI to your production domain
- [ ] Submit your app for OAuth verification (if requesting sensitive scopes)
- [ ] Add your production domain to **Authorized domains** in OAuth consent screen
- [ ] Store client ID securely (environment variables, secrets manager)
- [ ] Never commit client secrets to version control
- [ ] Enable HTTPS for your production domain
- [ ] Test the complete OAuth flow in production
- [ ] Monitor OAuth error rates in Google Cloud Console

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Check that the redirect URI in your OpenAPI spec exactly matches the one in Google Cloud Console
2. Ensure there are no trailing slashes or protocol mismatches (http vs https)
3. Wait a few minutes after updating the redirect URI in Google Cloud Console

### "access_denied" Error

**Problem**: User clicked "Cancel" or denied permissions.

**Solution**: This is expected behavior. The user can try logging in again.

### "invalid_client" Error

**Problem**: The client ID is incorrect or the OAuth client has been deleted.

**Solution**:
1. Verify your `GOOGLE_CLIENT_ID` environment variable is correct
2. Check that the OAuth client still exists in Google Cloud Console
3. Ensure you're using the Client ID, not the Client Secret

### Users Can't Sign In (Not in Test Users List)

**Problem**: During development, only test users can sign in.

**Solution**:
1. Add the user's email to the test users list in OAuth consent screen
2. Or publish your app (requires verification for sensitive scopes)

### "This app isn't verified" Warning

**Problem**: Google shows a warning that your app isn't verified.

**Solution**:
- During development: Click "Advanced" > "Go to [Your App] (unsafe)"
- For production: Submit your app for [OAuth verification](https://support.google.com/cloud/answer/9110914)

## Security Best Practices

1. **Never expose client secrets**: Client secrets should never be in client-side code or version control
2. **Use HTTPS in production**: Always use HTTPS for production redirect URIs
3. **Validate state parameter**: UIGen automatically validates the state parameter for CSRF protection
4. **Request minimum scopes**: Only request the scopes your application actually needs
5. **Rotate credentials**: Periodically rotate your OAuth credentials
6. **Monitor usage**: Regularly check Google Cloud Console for unusual activity

## Next Steps

- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - Set up GitHub OAuth
- [OAuth Security Best Practices](/docs/authentication/oauth-security) - Learn about OAuth security
- [OAuth Troubleshooting](/docs/authentication/oauth-troubleshooting) - Common issues and solutions

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
- [OAuth Verification Process](https://support.google.com/cloud/answer/9110914)
