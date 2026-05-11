/**
 * OAuth Error Handling and Logging Utilities
 * 
 * Maps OAuth error codes to user-friendly messages and provides logging functionality.
 * 
 * Requirements: 10.1-10.10
 */

/**
 * Standard OAuth 2.0 error codes
 */
export type OAuthErrorCode =
  | 'access_denied'
  | 'invalid_request'
  | 'unauthorized_client'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'server_error'
  | 'temporarily_unavailable'
  | 'invalid_grant'
  | 'invalid_client'
  | 'unsupported_grant_type'
  | 'state_mismatch'
  | 'network_error'
  | 'timeout'
  | 'unknown';

/**
 * OAuth error details
 */
export interface OAuthError {
  code: OAuthErrorCode;
  description?: string;
  timestamp: string;
}

/**
 * Map OAuth error codes to user-friendly messages
 * 
 * @param code - OAuth error code
 * @param description - Optional error description from provider
 * @returns User-friendly error message
 */
export function getErrorMessage(code: OAuthErrorCode, description?: string): string {
  const messages: Record<OAuthErrorCode, string> = {
    access_denied: 'You denied access to your account. Please try again if you want to sign in.',
    invalid_request: 'The authentication request was invalid. Please try again.',
    unauthorized_client: 'This application is not authorized to use this authentication method.',
    unsupported_response_type: 'The authentication provider does not support this response type.',
    invalid_scope: 'The requested permissions are invalid or not available.',
    server_error: 'The authentication provider encountered an error. Please try again later.',
    temporarily_unavailable: 'The authentication provider is temporarily unavailable. Please try again later.',
    invalid_grant: 'The authorization code is invalid or has expired. Please try again.',
    invalid_client: 'The application credentials are invalid. Please contact support.',
    unsupported_grant_type: 'The authentication provider does not support this grant type.',
    state_mismatch: 'Authentication state mismatch. This may be a security issue. Please try again.',
    network_error: 'Unable to connect to the authentication provider. Please check your internet connection.',
    timeout: 'The authentication request timed out. Please try again.',
    unknown: 'An unexpected error occurred during authentication. Please try again.'
  };

  const message = messages[code] || messages.unknown;

  // If provider gave a description, append it for debugging
  if (description && description !== message) {
    return `${message} (${description})`;
  }

  return message;
}

/**
 * Log OAuth error to console with timestamp and details
 * 
 * @param error - OAuth error details
 */
export function logOAuthError(error: OAuthError): void {
  console.error(
    `[OAuth Error] ${error.timestamp}`,
    `\nCode: ${error.code}`,
    error.description ? `\nDescription: ${error.description}` : '',
    `\nUser Message: ${getErrorMessage(error.code, error.description)}`
  );
}

/**
 * Create an OAuth error object with timestamp
 * 
 * @param code - OAuth error code
 * @param description - Optional error description
 * @returns OAuth error object
 */
export function createOAuthError(code: OAuthErrorCode, description?: string): OAuthError {
  return {
    code,
    description,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parse OAuth error from URL query parameters
 * 
 * @param searchParams - URLSearchParams from callback URL
 * @returns OAuth error object or null if no error
 */
export function parseOAuthError(searchParams: URLSearchParams): OAuthError | null {
  const error = searchParams.get('error');
  if (!error) {
    return null;
  }

  const description = searchParams.get('error_description') || undefined;
  const code = error as OAuthErrorCode;

  return createOAuthError(code, description);
}

/**
 * Check if an error code indicates a user action (not a system error)
 * 
 * @param code - OAuth error code
 * @returns True if error is due to user action
 */
export function isUserActionError(code: OAuthErrorCode): boolean {
  return code === 'access_denied';
}

/**
 * Check if an error code indicates a temporary issue that can be retried
 * 
 * @param code - OAuth error code
 * @returns True if error is temporary
 */
export function isTemporaryError(code: OAuthErrorCode): boolean {
  return code === 'temporarily_unavailable' || code === 'timeout' || code === 'network_error';
}

/**
 * Check if an error code indicates a configuration issue
 * 
 * @param code - OAuth error code
 * @returns True if error is due to configuration
 */
export function isConfigurationError(code: OAuthErrorCode): boolean {
  return (
    code === 'invalid_client' ||
    code === 'unauthorized_client' ||
    code === 'unsupported_response_type' ||
    code === 'unsupported_grant_type'
  );
}
