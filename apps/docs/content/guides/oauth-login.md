---
title: Using OAuth Login
description: User guide for logging in with OAuth providers (Google, GitHub, Facebook, Microsoft)
order: 5
---

# Using OAuth Login

This guide explains how to use OAuth social login in UIGen applications as an end user.

## What is OAuth Login?

OAuth login allows you to sign in to applications using your existing accounts from trusted providers like Google, GitHub, Facebook, or Microsoft. Instead of creating a new username and password, you can use an account you already have.

## Benefits of OAuth Login

**Convenience**:
- No need to remember another password
- Sign in with one click
- Faster registration process

**Security**:
- Your password is never shared with the application
- Two-factor authentication from your provider protects your account
- Easy to revoke access if needed

**Privacy**:
- Control what information you share
- Review permissions before authorizing
- Manage connected apps from your provider's settings

## How to Log In with OAuth

### Step 1: Choose Your Provider

On the login page, you'll see buttons for available OAuth providers:

- **Continue with Google** - Use your Google/Gmail account
- **Continue with GitHub** - Use your GitHub account
- **Continue with Facebook** - Use your Facebook account
- **Continue with Microsoft** - Use your Microsoft/Outlook account

Click the button for the provider you want to use.

### Step 2: Authorize the Application

You'll be redirected to your provider's website where you'll:

1. **Sign in** (if not already signed in)
2. **Review permissions** - See what information the app is requesting
3. **Authorize** - Click "Allow", "Authorize", or "Continue" to grant access

### Step 3: Return to the Application

After authorizing, you'll be automatically redirected back to the application and logged in.

## What Information is Shared?

When you log in with OAuth, the application typically requests:

**Basic Profile Information**:
- Your name
- Your email address
- Your profile picture

**Why this information is needed**:
- **Name**: To personalize your experience and identify you in the app
- **Email**: To send notifications and communicate with you
- **Profile picture**: To display your avatar in the app

The application will show you exactly what information it's requesting before you authorize.

## Managing Your OAuth Connections

### Viewing Connected Apps

You can see which applications have access to your account:

**Google**:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. View all connected apps
3. Click an app to see details or remove access

**GitHub**:
1. Go to [GitHub Settings > Applications](https://github.com/settings/applications)
2. Click the "Authorized OAuth Apps" tab
3. View or revoke access for any app

**Facebook**:
1. Go to [Facebook Settings > Apps and Websites](https://www.facebook.com/settings?tab=applications)
2. View all connected apps
3. Remove apps you no longer use

**Microsoft**:
1. Go to [Microsoft Account Privacy](https://account.microsoft.com/privacy)
2. View apps with access to your account
3. Manage or remove permissions

### Revoking Access

If you want to disconnect an application:

1. Go to your provider's settings (links above)
2. Find the application in your connected apps list
3. Click "Remove access", "Revoke", or "Delete"
4. Confirm the action

**What happens when you revoke access**:
- The application can no longer access your information
- You'll need to log in again if you want to use the app
- Your data in the application is not automatically deleted (contact the app for data deletion)

## Troubleshooting

### "Authorization Cancelled" Message

**What happened**: You clicked "Cancel" or "Deny" on the authorization screen.

**Solution**: Click the OAuth button again and click "Allow" or "Authorize" to grant access.

### "Access Denied" Error

**What happened**: The authorization was not completed successfully.

**Possible causes**:
- You denied the requested permissions
- Your account doesn't meet the app's requirements
- There was a temporary issue with the provider

**Solution**: Try logging in again. If the problem persists, contact the application's support team.

### "Email Not Available" Message

**What happened**: The application couldn't retrieve your email address.

**Possible causes**:
- You denied email permission during authorization
- Your account doesn't have a verified email address
- Your email is set to private (GitHub)

**Solution**:
- **Google/Facebook/Microsoft**: Ensure your account has a verified email
- **GitHub**: Make your email public in [GitHub Email Settings](https://github.com/settings/emails) or grant email access during authorization

### Can't Sign In After Revoking Access

**What happened**: You revoked the app's access in your provider settings.

**Solution**: This is expected. Click the OAuth button again to re-authorize the application.

### Redirected to Wrong Page

**What happened**: After logging in, you're not on the page you expected.

**Solution**: This is usually normal - most apps redirect to the home page or dashboard after login. If you were trying to access a specific page, navigate to it after logging in.

## Security Best Practices

### Verify the Application

Before authorizing:
- Check the application name matches what you expect
- Review the permissions being requested
- Ensure you're on the official provider's website (check the URL)

### Review Permissions Carefully

Only authorize applications that:
- You trust
- Request reasonable permissions
- You actually want to use

### Regular Security Checkups

Periodically review your connected apps:
- Remove apps you no longer use
- Check for unfamiliar apps
- Revoke access to suspicious apps

### Use Two-Factor Authentication

Enable two-factor authentication (2FA) on your provider accounts:
- **Google**: [2-Step Verification](https://www.google.com/landing/2step/)
- **GitHub**: [Two-factor authentication](https://github.com/settings/security)
- **Facebook**: [Two-factor authentication](https://www.facebook.com/security/2fac/setup/)
- **Microsoft**: [Two-step verification](https://account.microsoft.com/security)

This adds an extra layer of security to your OAuth logins.

## Privacy Considerations

### What Data is Collected

When you use OAuth login, the application receives:
- Information you explicitly authorize (name, email, profile picture)
- A unique identifier from the provider
- An access token (used to verify your identity)

### What Data is NOT Shared

The application does NOT receive:
- Your password
- Your full account history
- Information you didn't authorize
- Access to other services (unless explicitly requested)

### Data Retention

- The application stores your profile information to maintain your account
- Access tokens are stored securely and expire automatically
- You can request data deletion by contacting the application

### Third-Party Access

- Only the application you authorize can access your information
- The provider (Google, GitHub, etc.) does not share your data with other apps without your permission
- Each authorization is independent

## Frequently Asked Questions

### Can I use multiple OAuth providers?

It depends on the application. Some apps allow you to connect multiple providers to the same account, while others create separate accounts for each provider.

### What if I don't have any of the available providers?

If the application offers traditional username/password login, you can use that instead. Otherwise, you'll need to create an account with one of the supported providers.

### Is OAuth login secure?

Yes, OAuth is a widely-used industry standard for secure authentication. Your password is never shared with the application, and you can revoke access at any time.

### Can I switch from OAuth to password login?

This depends on the application. Some apps allow you to add a password to your OAuth account, while others only support one authentication method. Check the app's account settings or contact support.

### What happens if I delete my provider account?

If you delete your Google, GitHub, Facebook, or Microsoft account, you won't be able to log in to applications using that provider. You may need to contact the application to regain access or create a new account.

### Can I change which email is used?

The email address comes from your provider account. To change it:
1. Update your email in your provider's settings
2. The application will use the new email next time you log in

### Why does the app need my email?

Applications typically need your email to:
- Identify your account uniquely
- Send important notifications
- Contact you about your account
- Comply with legal requirements

### Can I use OAuth on mobile devices?

Yes, OAuth works on mobile devices. The process is the same - you'll be redirected to your provider's mobile website or app to authorize.

## Getting Help

If you're having trouble with OAuth login:

1. **Check this guide** for common issues and solutions
2. **Contact the application's support** for app-specific issues
3. **Contact your provider's support** for account-related issues:
   - [Google Support](https://support.google.com/)
   - [GitHub Support](https://support.github.com/)
   - [Facebook Help Center](https://www.facebook.com/help/)
   - [Microsoft Support](https://support.microsoft.com/)

## Related Resources

- [OAuth Security Best Practices](/docs/authentication/oauth-security) - For developers
- [OAuth Configuration](/docs/authentication/oauth-configuration) - For developers
- [Google OAuth Setup](/docs/authentication/oauth-google-setup) - For developers
- [GitHub OAuth Setup](/docs/authentication/oauth-github-setup) - For developers

## Summary

OAuth login provides a convenient and secure way to access applications using accounts you already have. By understanding how it works and following security best practices, you can safely use OAuth to streamline your login experience across multiple applications.

**Key Takeaways**:
- OAuth is secure and convenient
- You control what information is shared
- You can revoke access at any time
- Your password is never shared with applications
- Review permissions before authorizing
- Regularly audit your connected apps
