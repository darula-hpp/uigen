---
title: Facebook OAuth Setup
description: Step-by-step guide to configure Facebook OAuth for your UIGen application
order: 6
---

# Facebook OAuth Setup

This guide walks you through setting up Facebook OAuth authentication for your UIGen application.

## Prerequisites

- A Facebook account
- Your UIGen application's redirect URI (e.g., `http://localhost:3000/auth/callback` for development)

## Step 1: Create a Facebook App

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click **My Apps** in the top navigation
3. Click **Create App**
4. Select **Consumer** as the app type (for user authentication)
5. Click **Next**

## Step 2: Configure Basic App Settings

Fill in the app details:

**Display Name**:
- Enter your application name (e.g., "My UIGen App")
- This name will be shown to users during login

**App Contact Email**:
- Enter your email address for Facebook to contact you

**App Purpose** (Optional):
- Select the purpose that best describes your app

Click **Create App**

## Step 3: Add Facebook Login Product

1. In your app dashboard, find **Facebook Login** in the products list
2. Click **Set Up** on the Facebook Login card
3. Select **Web** as your platform
4. Enter your site URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
5. Click **Save** and **Continue**

## Step 4: Configure OAuth Settings

1. In the left sidebar, go to **Facebook Login** > **Settings**
2. Configure the following settings:

**Client OAuth Login**: Enable (toggle ON)

**Web OAuth Login**: Enable (toggle ON)

**Valid OAuth Redirect URIs**:
- Add your redirect URIs (one per line):
  - Development: `http://localhost:3000/auth/callback`
  - Production: `https://yourdomain.com/auth/callback`

**Login with the JavaScript SDK**: Enable (toggle ON)

3. Click **Save Changes**

## Step 5: Get Your App Credentials

1. In the left sidebar, go to **Settings** > **Basic**
2. You'll see your app credentials:
   - **App ID**: Copy this value - you'll need it for UIGen configuration
   - **App Secret**: Click **Show** to reveal (keep this secure)

## Step 6: Configure App Domains

1. Still in **Settings** > **Basic**
2. Scroll to **App Domains**
3. Add your domains (without protocol):
   - Development: `localhost`
   - Production: `yourdomain.com`
4. Click **Save Changes**

## Step 7: Configure UIGen

Add the Facebook OAuth provider to your OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: facebook
        clientId: ${FACEBOOK_CLIENT_ID}
        redirectUri: ${FACEBOOK_REDIRECT_URI}
        scopes:
          - email
          - public_profile
```

## Step 8: Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export FACEBOOK_CLIENT_ID="1234567890123456"
export FACEBOOK_REDIRECT_URI="http://localhost:3000/auth/callback"
```

## Step 9: Test Your Integration

1. Start your UIGen application:
   ```bash
   npx @uigen-dev/cli serve openapi.yaml
   ```

2. Navigate to `http://localhost:3000`
3. Click the **Continue with Facebook** button
4. You should be redirected to Facebook's login page
5. Sign in with your Facebook account
6. Grant the requested permissions
7. You should be redirected back to your application and logged in

## Scopes Explained

### Default Scopes

UIGen requests these scopes by default:

| Scope | Description | Data Accessed |
|-------|-------------|---------------|
| `email` | Email address | User's primary email address |
| `public_profile` | Public profile information | Name, profile picture, age range, gender |

### Additional Scopes

You can request additional scopes if needed (requires app review):

| Scope | Description | Use Case | Review Required |
|-------|-------------|----------|-----------------|
| `user_friends` | Friends list | Social features | Yes |
| `user_birthday` | Birthday | Age verification | Yes |
| `user_location` | Location | Location-based features | Yes |
| `user_photos` | Photos | Photo integration | Yes |
| `pages_show_list` | Pages managed | Page management | Yes |

See [Facebook Permissions Reference](https://developers.facebook.com/docs/permissions/reference) for a complete list.

## App Review Process

### When Review Is Required

Facebook requires app review for:
- Apps requesting permissions beyond `email` and `public_profile`
- Apps used by more than a few test users
- Apps going to production

### How to Submit for Review

1. In your app dashboard, go to **App Review** > **Permissions and Features**
2. Click **Request Advanced Access** for the permissions you need
3. Provide:
   - Detailed description of how you use each permission
   - Step-by-step instructions for reviewers
   - Screencast demonstrating the feature
4. Submit for review (typically takes 3-7 days)

### Development Mode vs Live Mode

**Development Mode**:
- Only app admins, developers, and testers can use the app
- No app review required
- Suitable for testing

**Live Mode**:
- Available to all Facebook users
- Requires app review for advanced permissions
- Required for production

To switch to Live Mode:
1. Complete app review (if needed)
2. Go to **Settings** > **Basic**
3. Toggle **App Mode** to **Live**

## Production Checklist

Before deploying to production:

- [ ] Complete Facebook app review (if requesting advanced permissions)
- [ ] Switch app to Live Mode
- [ ] Update redirect URI to your production domain
- [ ] Add production domain to App Domains
- [ ] Store App ID securely (environment variables, secrets manager)
- [ ] Never commit App Secret to version control
- [ ] Enable HTTPS for your production domain
- [ ] Test the complete OAuth flow in production
- [ ] Add Privacy Policy URL in app settings
- [ ] Add Terms of Service URL in app settings
- [ ] Configure Data Deletion Request URL (GDPR compliance)

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in Facebook app settings.

**Solution**:
1. Check that the redirect URI in your OpenAPI spec exactly matches the one in Facebook Login Settings
2. Ensure there are no trailing slashes
3. Verify protocol (http vs https) matches
4. Facebook requires exact match including protocol and path

### "Can't Load URL: The domain of this URL isn't included in the app's domains"

**Problem**: Your domain is not listed in App Domains.

**Solution**:
1. Go to **Settings** > **Basic**
2. Add your domain to **App Domains** (without protocol)
3. Save changes and try again

### "App Not Set Up: This app is still in development mode"

**Problem**: App is in development mode and user is not a tester.

**Solution**:
- **For testing**: Add user as a tester in **Roles** > **Testers**
- **For production**: Complete app review and switch to Live Mode

### Email Not Returned

**Problem**: User's email is not included in the profile data.

**Solution**:
1. Ensure you're requesting the `email` scope
2. User must have a verified email address on Facebook
3. User must grant email permission during authorization
4. Some users may not have an email associated with their Facebook account

### "This app has not been approved for login with Facebook"

**Problem**: App requires review but hasn't been approved yet.

**Solution**:
1. Submit app for review with required permissions
2. Wait for approval (typically 3-7 days)
3. Or add users as testers for development

### "Invalid OAuth access token"

**Problem**: Access token has expired or been revoked.

**Solution**:
1. UIGen automatically attempts token refresh
2. If refresh fails, user will be redirected to login
3. User may have revoked app access in Facebook settings

## Security Best Practices

1. **Never expose App Secret**: Keep App Secret server-side only
2. **Use HTTPS in production**: Always use HTTPS for production redirect URIs
3. **Validate state parameter**: UIGen automatically validates the state parameter for CSRF protection
4. **Request minimum scopes**: Only request the scopes your application actually needs
5. **Implement data deletion**: Provide a data deletion callback URL for GDPR compliance
6. **Monitor access**: Regularly review app analytics in Facebook dashboard

## Data Deletion Callback (GDPR Compliance)

Facebook requires apps to implement a data deletion callback:

1. Create an endpoint that handles data deletion requests:
   ```
   POST https://yourdomain.com/facebook/data-deletion
   ```

2. Add the URL in **Settings** > **Basic** > **Data Deletion Request URL**

3. Implement the endpoint to:
   - Verify the signed request from Facebook
   - Delete user data from your database
   - Return confirmation

Example response:
```json
{
  "url": "https://yourdomain.com/deletion-status?id=12345",
  "confirmation_code": "abc123"
}
```

## Managing Test Users

### Add Test Users

1. Go to **Roles** > **Test Users**
2. Click **Add**
3. Enter number of test users to create
4. Click **Create Test Users**

### Add Real Users as Testers

1. Go to **Roles** > **Testers**
2. Click **Add Testers**
3. Enter Facebook user IDs or usernames
4. Click **Submit**
5. Users must accept the tester invitation

## User Experience Tips

1. **Clear app name**: Use a descriptive name that users will recognize
2. **Add app icon**: Upload a 1024x1024 icon in **Settings** > **Basic**
3. **Provide privacy policy**: Required for app review and user trust
4. **Request minimal permissions**: Users are more likely to authorize apps requesting fewer permissions
5. **Explain permission usage**: Tell users why you need each permission

## Facebook Login Button Guidelines

Facebook provides design guidelines for login buttons:

**Recommended**:
- Use Facebook blue (#1877F2)
- Include Facebook logo
- Text: "Continue with Facebook" or "Log in with Facebook"
- Minimum height: 40px

**Not Allowed**:
- Don't modify the Facebook logo
- Don't use "Sign in with Facebook" (use "Log in" or "Continue")
- Don't make the button smaller than 40px height

UIGen follows these guidelines automatically.

## Next Steps

- [Microsoft OAuth Setup](/docs/authentication/oauth-microsoft-setup) - Set up Microsoft OAuth
- [OAuth Security Best Practices](/docs/authentication/oauth-security) - Learn about OAuth security
- [OAuth Troubleshooting](/docs/authentication/oauth-troubleshooting) - Common issues and solutions

## Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Facebook Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [Facebook App Review](https://developers.facebook.com/docs/app-review)
- [Facebook Platform Policy](https://developers.facebook.com/policy)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)
