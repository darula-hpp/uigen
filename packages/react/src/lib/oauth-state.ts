/**
 * OAuth State Parameter Security Utilities
 * 
 * Provides cryptographically secure state parameter generation and validation
 * for OAuth 2.0 authorization flows to prevent CSRF attacks.
 * 
 * Requirements: 3.2, 12.1-12.10
 */

/**
 * Generate a cryptographically secure random state parameter with 128-bit entropy.
 * 
 * The state parameter is used in OAuth flows to prevent CSRF attacks by ensuring
 * that the authorization callback originated from the same client that initiated
 * the authorization request.
 * 
 * @returns A 32-character hexadecimal string representing 128 bits of entropy
 * 
 * **Validates: Requirements 3.2, 12.1, 12.10**
 */
export function generateState(): string {
  const array = new Uint8Array(16); // 128 bits = 16 bytes
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store the state parameter in sessionStorage for later validation.
 * 
 * The state is stored with a provider-specific key to support multiple
 * concurrent OAuth flows with different providers.
 * 
 * @param provider - The OAuth provider identifier (e.g., 'google', 'github')
 * @param state - The state parameter to store
 * 
 * **Validates: Requirements 12.2**
 */
export function storeState(provider: string, state: string): void {
  try {
    const key = `oauth_state_${provider}`;
    sessionStorage.setItem(key, state);
  } catch (error) {
    // Handle storage errors gracefully (e.g., quota exceeded, private browsing)
    console.error('Failed to store OAuth state:', error);
  }
}

/**
 * Validate that the returned state parameter matches the stored value.
 * 
 * This validation is critical for CSRF protection. If the state doesn't match,
 * the authorization callback should be rejected.
 * 
 * @param provider - The OAuth provider identifier
 * @param state - The state parameter received from the OAuth callback
 * @returns true if the state matches the stored value, false otherwise
 * 
 * **Validates: Requirements 12.4, 12.5, 12.6**
 */
export function validateState(provider: string, state: string): boolean {
  try {
    const key = `oauth_state_${provider}`;
    const storedState = sessionStorage.getItem(key);
    
    if (!storedState) {
      return false;
    }
    
    return storedState === state;
  } catch (error) {
    // Handle storage errors gracefully
    console.error('Failed to validate OAuth state:', error);
    return false;
  }
}

/**
 * Clear the stored state parameter after validation.
 * 
 * State parameters should be single-use. After successful validation,
 * the state should be removed from storage to prevent replay attacks.
 * 
 * @param provider - The OAuth provider identifier
 * 
 * **Validates: Requirements 12.8, 12.9**
 */
export function clearState(provider: string): void {
  try {
    const key = `oauth_state_${provider}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    // Handle storage errors gracefully
    console.error('Failed to clear OAuth state:', error);
  }
}

/**
 * Retrieve the stored state parameter without removing it.
 * 
 * This is useful for debugging or when you need to check the state
 * without consuming it.
 * 
 * @param provider - The OAuth provider identifier
 * @returns The stored state parameter, or null if not found
 */
export function getStoredState(provider: string): string | null {
  try {
    const key = `oauth_state_${provider}`;
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Failed to retrieve OAuth state:', error);
    return null;
  }
}
