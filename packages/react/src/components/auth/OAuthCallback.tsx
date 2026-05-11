/**
 * OAuth Callback Component
 * 
 * Handles OAuth provider redirects after user authorization.
 * Extracts authorization code and state from URL, validates state parameter,
 * exchanges code for access token, and redirects to appropriate destination.
 * 
 * Requirements: 3.7, 3.8, 7.1-7.10, 10.1-10.10
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { OAuthProvider, UIGenApp } from '@uigen-dev/core';
import { OAuthStrategy } from '@/lib/oauth-strategy';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getProviderMetadata } from '@/lib/oauth-providers';

/**
 * OAuthCallback component
 * 
 * Processes OAuth provider callbacks:
 * 1. Extract query parameters (code, state, error, error_description, token)
 * 2. Determine provider from URL path or state
 * 3. Validate state parameter
 * 4. Handle error parameter from provider
 * 5. Exchange code for access token
 * 6. Redirect to dashboard on success or login on failure
 * 7. Clean up URL parameters
 * 
 * **Validates: Requirements 3.7, 3.8, 7.1-7.10, 10.1-10.10**
 */
export function OAuthCallback({ config }: { config: UIGenApp }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for token in query parameter (passed from backend redirect)
        const tokenParam = searchParams.get('token');
        
        if (tokenParam) {
          // Token found in query parameter - store it and redirect
          sessionStorage.setItem('uigen_auth', JSON.stringify({
            type: 'bearer',
            token: tokenParam
          }));
          
          // Clean up URL and redirect to dashboard
          cleanupUrl();
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Check for token in URL fragment (fallback for other OAuth flows)
        const hash = window.location.hash;
        
        if (hash && hash.length > 1) {
          // Remove the leading # and parse as query string
          const hashParams = new URLSearchParams(hash.substring(1));
          const fragmentToken = hashParams.get('access_token');
          
          if (fragmentToken) {
            // Token found in URL fragment - store it and redirect
            sessionStorage.setItem('uigen_auth', JSON.stringify({
              type: 'bearer',
              token: fragmentToken
            }));
            
            // Clean up URL and redirect to dashboard
            cleanupUrl();
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        
        // Extract query parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle error parameter from provider (don't attempt token exchange)
        if (errorParam) {
          const errorMessage = getErrorMessage(errorParam, errorDescription);
          setError(errorMessage);
          setProcessing(false);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // COOKIE-BASED AUTH: If no code and no fragment token, check session cookie
        // Use sessionValidationEndpoint from OAuth provider config if available
        if (!code) {
          try {
            // Get the first enabled OAuth provider's sessionValidationEndpoint
            const oauthProvider = config.auth.oauthProviders?.find(p => p.enabled);
            const sessionEndpoint = oauthProvider?.sessionValidationEndpoint;
            
            if (sessionEndpoint) {
              // Use the explicitly configured session validation endpoint
              const response = await fetch(`/api${sessionEndpoint}`, {
                credentials: 'include',
                headers: {
                  'Accept': 'application/json'
                }
              });

              if (response.ok) {
                const userData = await response.json();
                
                // Store user info in sessionStorage (not the token)
                sessionStorage.setItem('uigen_auth', JSON.stringify({
                  type: 'cookie',
                  user: userData
                }));
                
                // Clean up URL and redirect to dashboard
                cleanupUrl();
                navigate('/dashboard', { replace: true });
                return;
              }
            }
          } catch (err) {
            console.error('Session validation error:', err);
          }
          
          // If session validation fails, treat as missing parameters
          setError('Authentication session not found. Please try again.');
          setProcessing(false);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // TOKEN-BASED AUTH: Validate required parameters for code exchange
        if (!state) {
          setError('Missing authentication parameters. Please try again.');
          setProcessing(false);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Determine provider from sessionStorage
        // The provider info should be stored during OAuth initiation
        const provider = getProviderFromState(state);
        
        if (!provider) {
          setError('Invalid authentication state. Please try again.');
          setProcessing(false);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Initialize OAuth strategy
        const strategy = new OAuthStrategy();

        // Exchange code for token (includes state validation)
        const result = await strategy.loginWithCallback({
          code,
          state,
          provider
        });

        if (result.success) {
          // Clean up URL parameters
          cleanupUrl();
          
          // Redirect to dashboard on success
          navigate('/dashboard', { replace: true });
        } else {
          // Display error and redirect to login
          setError(result.error || 'Authentication failed. Please try again.');
          setProcessing(false);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('An unexpected error occurred. Please try again.');
        setProcessing(false);
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {processing ? (
            <>
              <div className="flex justify-center mb-4">
                <LoadingSpinner size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Completing sign in...
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please wait while we complete your authentication
              </p>
            </>
          ) : error ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-destructive">
                Authentication Failed
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Redirecting to login page...
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Get user-friendly error message based on OAuth error code
 * 
 * @param errorCode - OAuth error code from provider
 * @param errorDescription - Optional error description from provider
 * @returns User-friendly error message
 * 
 * **Validates: Requirements 10.1-10.10**
 */
function getErrorMessage(errorCode: string, errorDescription: string | null): string {
  switch (errorCode) {
    case 'access_denied':
      return 'Authorization was denied. Please try again.';
    case 'invalid_request':
      return 'Invalid authentication request. Please try again.';
    case 'unauthorized_client':
      return 'This application is not authorized. Please contact support.';
    case 'unsupported_response_type':
      return 'Authentication method not supported. Please contact support.';
    case 'invalid_scope':
      return 'Invalid permissions requested. Please contact support.';
    case 'server_error':
      return 'Authentication provider error. Please try again later.';
    case 'temporarily_unavailable':
      return 'Authentication provider temporarily unavailable. Please try again later.';
    default:
      // Use error description if available, otherwise generic message
      return errorDescription || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Retrieve provider configuration from sessionStorage based on state parameter
 * 
 * During OAuth initiation, the provider configuration should be stored in sessionStorage
 * with a key that includes the state parameter. This allows us to retrieve the provider
 * configuration when handling the callback.
 * 
 * @param state - State parameter from OAuth callback
 * @returns OAuth provider configuration or null if not found
 */
function getProviderFromState(state: string): OAuthProvider | null {
  try {
    // Try to find provider by checking all possible provider state keys
    const providers = ['google', 'github', 'facebook', 'microsoft'];
    
    for (const providerName of providers) {
      const storedState = sessionStorage.getItem(`oauth_state_${providerName}`);
      
      if (storedState === state) {
        // Found matching state, retrieve provider config
        const providerConfigJson = sessionStorage.getItem(`oauth_provider_${providerName}`);
        
        if (providerConfigJson) {
          const providerConfig = JSON.parse(providerConfigJson) as OAuthProvider;
          return providerConfig;
        }
        
        // If no stored config, construct minimal config from metadata
        const metadata = getProviderMetadata(providerName);
        if (metadata) {
          // Retrieve stored config from localStorage (fallback)
          const storedConfig = localStorage.getItem('oauth_last_provider');
          if (storedConfig) {
            const config = JSON.parse(storedConfig) as OAuthProvider;
            if (config.provider === providerName) {
              return config;
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving provider from state:', error);
    return null;
  }
}

/**
 * Clean up URL parameters after processing OAuth callback
 * 
 * Removes code and state parameters from the browser's address bar
 * using window.history.replaceState to avoid exposing sensitive data.
 * 
 * **Validates: Requirement 7.9**
 */
function cleanupUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('token'); // Remove token from URL
    
    window.history.replaceState({}, document.title, url.toString());
  } catch (error) {
    console.error('Error cleaning up URL:', error);
  }
}
