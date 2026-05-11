---
title: Microsoft OAuth Setup
description: Step-by-step guide to configure Microsoft OAuth for your UIGen application
order: 7
---

# Microsoft OAuth Setup

This guide walks you through setting up Microsoft OAuth authentication (Microsoft Entra ID, formerly Azure AD) for your UIGen application.

## Prerequisites

- A Microsoft account (personal or work/school account)
- Your UIGen application's redirect URI (e.g., `http://localhost:3000/auth/callback` for development)

## Step 1: Access Azure Portal

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. If you don't have an Azure subscription, you can still register apps for free

## Step 2: Register a New Application

1. In the Azure Portal, search for **Microsoft Entra ID** (or **Azure Active Directory**)
2. Click on **Microsoft Entra ID** in the search results
3. In the left sidebar, click **App registrations**
4. Click **New registration**

## Step 3: Configure Application Registration

Fill in the registration details:

**Name**:
- Enter your application name (e.g., "My UIGen App")
- This name will be shown to users during consent

**Supported account types**:
- **Accounts in any organizational directory and personal Microsoft accounts** (recommended for most apps)
  - Allows both work/school and personal Microsoft accounts
- Or choose a more restrictive option based on your needs

**Redirect URI**:
- Select platform: **Web**
- Enter your redirect URI:
  - Development: `http://localhost:3000/auth/callback`
  - Production: `https://yourdomain.com/auth/callback`

Click **Register**

## Step 4: Get Your Application Credentials

After registration, you'll see the app overview:

1. **Application (client) ID**: Copy this value - you'll need it for UIGen configuration
2. **Directory (tenant) ID**: Note this value (needed for some configurations)

## Step 5: Add Additional Redirect URIs (Optional)

If you need multiple redirect URIs:

1. In your app, go to **Authentication** in the left sidebar
2. Under **Platform configurations** > **Web**, click **Add URI**
3. Add additional URIs:
   - Staging: `https://staging.yourdomain.com/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
4. Click **Save**

## Step 6: Configure Token Settings

1. Still in **Authentication**, scroll to **Implicit grant and hybrid flows**
2. Enable:
   - ✅ **ID tokens** (for OpenID Connect)
3. Click **Save**

## Step 7: Configure API Permissions

1. In the left sidebar, click **API permissions**
2. You should see **Microsoft Graph** with **User.Read** permission by default
3. To add more permissions, click **Add a permission**:
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Add permissions as needed (e.g., `email`, `profile`, `openid`)
4. Click **Add permissions**

Default permissions are sufficient for basic authentication.

## Step 8: Configure UIGen

Add the Microsoft OAuth provider to your OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  x-uigen-auth:
    providers:
      - provider: microsoft
        clientId: ${MICROSOFT_CLIENT_ID}
        redirectUri: ${MICROSOFT_REDIRECT_URI}
        scopes:
          - openid
          - email
          - profile
```

## Step 9: Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export MICROSOFT_CLIENT_ID="12345678-1234-1234-1234-123456789012"
export MICROSOFT_REDIRECT_URI="http://localhost:3000/auth/callback"
```

## Step 10: Test Your Integration

1. Start your UIGen application:
   ```bash
   npx @uigen-dev/cli serve openapi.yaml
   ```

2. Navigate to `http://localhost:3000`
3. Click the **Continue with Microsoft** button
4. You should be redirected to Microsoft's login page
5. Sign in with your Microsoft account
6. Grant the requested permissions
7. You should be redirected back to your application and logged in

## Scopes Explained

### Default Scopes

UIGen requests these scopes by default:

| Scope | Description | Data Accessed |
|-------|-------------|---------------|
| `openid` | OpenID Connect authentication | User's unique Microsoft ID |
| `email` | Email address | User's primary email address |
| `profile` | Basic profile information | Name, profile picture |

### Additional Scopes

You can request additional Microsoft Graph scopes if needed:

| Scope | Description | Use Case |
|-------|-------------|----------|
| `User.Read` | Read user profile | Full profile access (default) |
| `User.ReadBasic.All` | Read all users' basic profiles | User directory access |
| `Calendars.Read` | Read user calendars | Calendar integration |
| `Mail.Read` | Read user mail | Email integration |
| `Files.Read` | Read user files | OneDrive integration |
| `offline_access` | Refresh token access | Long-lived sessions |

See [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference) for a complete list.

## Account Types Explained

### Personal Microsoft Accounts
- Outlook.com, Hotmail.com, Live.com accounts
- Xbox, Skype accounts
- Consumer Microsoft services

### Work or School Accounts
- Microsoft 365 accounts
- Azure AD accounts
- Organizational accounts

### Configuration Options

When registering your app, you chose one of:

1. **Accounts in this organizational directory only** (Single tenant)
   - Only users from your organization
   - Most restrictive

2. **Accounts in any organizational directory** (Multi-tenant)
   - Users from any Microsoft 365 organization
   - No personal accounts

3. **Accounts in any organizational directory and personal Microsoft accounts** (Multi-tenant + personal)
   - Both work/school and personal accounts
   - Most flexible (recommended)

4. **Personal Microsoft accounts only**
   - Only consumer accounts
   - No organizational accounts

## Production Checklist

Before deploying to production:

- [ ] Update redirect URI to your production domain
- [ ] Add production domain to redirect URIs in Azure
- [ ] Store Application ID securely (environment variables, secrets manager)
- [ ] Never commit client secrets to version control (if using confidential client flow)
- [ ] Enable HTTPS for your production domain
- [ ] Test the complete OAuth flow in production
- [ ] Configure branding (logo, colors) in Azure portal
- [ ] Add Privacy Policy URL in app branding
- [ ] Add Terms of Service URL in app branding
- [ ] Review and minimize requested permissions

## Troubleshooting

### "AADSTS50011: The redirect URI specified in the request does not match"

**Problem**: The redirect URI doesn't match what's configured in Azure.

**Solution**:
1. Check that the redirect URI in your OpenAPI spec exactly matches the one in Azure app registration
2. Ensure there are no trailing slashes
3. Verify protocol (http vs https) matches
4. Azure requires exact match including protocol, domain, and path

### "AADSTS65001: The user or administrator has not consented to use the application"

**Problem**: User hasn't granted consent for the requested permissions.

**Solution**:
1. This is normal for first-time users
2. User will see consent screen and can grant permissions
3. For organizational accounts, admin may need to grant consent

### "AADSTS700016: Application not found in the directory"

**Problem**: Application ID is incorrect or app was deleted.

**Solution**:
1. Verify your `MICROSOFT_CLIENT_ID` environment variable is correct
2. Check that the app still exists in Azure portal
3. Ensure you're using the Application (client) ID, not the Object ID

### "AADSTS50105: The signed in user is not assigned to a role for the application"

**Problem**: User is not assigned to the application (for apps requiring assignment).

**Solution**:
1. Go to **Enterprise applications** in Azure portal
2. Find your app and go to **Users and groups**
3. Add the user or disable **User assignment required** in **Properties**

### Email Not Returned

**Problem**: User's email is not included in the token.

**Solution**:
1. Ensure you're requesting the `email` scope
2. For work/school accounts, email is usually available
3. For personal accounts, user must have verified email
4. Check that `email` claim is included in token configuration

### "AADSTS90094: The grant requires admin permission"

**Problem**: Requested permission requires admin consent.

**Solution**:
1. Some permissions require admin consent in organizational tenants
2. Contact your organization's admin to grant consent
3. Or request only permissions that don't require admin consent

## Admin Consent

### When Admin Consent Is Required

For organizational accounts, some permissions require admin consent:
- Application permissions (app-only access)
- High-privilege delegated permissions
- Organization-wide data access

### How to Request Admin Consent

**Option 1: Admin Consent URL**

Construct an admin consent URL:
```
https://login.microsoftonline.com/{tenant}/adminconsent
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
```

**Option 2: Azure Portal**

Admin can grant consent in Azure portal:
1. Go to **Enterprise applications**
2. Find your app
3. Go to **Permissions**
4. Click **Grant admin consent for [Organization]**

## Branding Your Application

Customize how your app appears to users:

1. In your app registration, go to **Branding & properties**
2. Configure:
   - **Name**: Display name shown to users
   - **Logo**: 240x240 PNG image
   - **Home page URL**: Your application's homepage
   - **Terms of service URL**: Link to your terms
   - **Privacy statement URL**: Link to your privacy policy
3. Click **Save**

## Multi-Tenant Applications

If your app supports multiple organizations:

### Configuration

1. Set **Supported account types** to multi-tenant during registration
2. Use common endpoint in authorization URL:
   ```
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize
   ```

### Considerations

- Each tenant admin must consent to your app
- Users from any organization can sign in
- Implement tenant isolation in your application
- Store tenant ID with user data

## Security Best Practices

1. **Never expose client secrets**: Keep secrets server-side only (if using confidential client flow)
2. **Use HTTPS in production**: Always use HTTPS for production redirect URIs
3. **Validate state parameter**: UIGen automatically validates the state parameter for CSRF protection
4. **Request minimum scopes**: Only request the scopes your application actually needs
5. **Implement token validation**: Validate ID tokens and access tokens
6. **Use token caching**: Cache tokens to reduce authentication requests
7. **Monitor sign-ins**: Review sign-in logs in Azure portal

## Token Lifetime

Microsoft tokens have specific lifetimes:

| Token Type | Default Lifetime | Renewable |
|------------|------------------|-----------|
| Access Token | 1 hour | No (use refresh token) |
| Refresh Token | 90 days (inactive) | Yes (rolling) |
| ID Token | 1 hour | No |

UIGen automatically handles token refresh using refresh tokens.

## Conditional Access

Organizations can enforce conditional access policies:

- Multi-factor authentication (MFA)
- Device compliance
- Location restrictions
- Risk-based access

Your application should handle:
- MFA challenges
- Conditional access errors
- Graceful fallback for blocked users

## Next Steps

- [OAuth Security Best Practices](/docs/authentication/oauth-security) - Learn about OAuth security
- [OAuth Troubleshooting](/docs/authentication/oauth-troubleshooting) - Common issues and solutions
- [Google OAuth Setup](/docs/authentication/oauth-google-setup) - Set up Google OAuth
- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - Set up GitHub OAuth

## Additional Resources

- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Authentication Library (MSAL)](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Conditional Access](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/overview)
