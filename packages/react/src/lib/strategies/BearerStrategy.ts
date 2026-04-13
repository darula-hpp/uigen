import type { IAuthStrategy, AuthResult, SerializedAuthData, BearerCredentials } from './IAuthStrategy';

/**
 * Bearer token authentication strategy
 * Requirement 4: Implement Bearer Token Strategy
 */
export class BearerStrategy implements IAuthStrategy {
  readonly type = 'bearer'; // Requirement 4.1
  private token: string | null = null;
  
  /**
   * Authenticate with bearer token
   * Requirements 4.2, 4.8: Store token, validate non-empty
   */
  async authenticate(credentials: unknown): Promise<AuthResult> {
    if (!this.isBearerCredentials(credentials)) {
      return { success: false, error: 'Invalid credentials format' };
    }
    
    const { token } = credentials;
    
    // Requirement 4.8: Reject empty tokens
    if (!token || token.trim() === '') {
      return { success: false, error: 'Token cannot be empty' };
    }
    
    this.token = token;
    return { success: true };
  }
  
  /**
   * Get headers for proxy injection
   * Requirement 4.3: Return x-uigen-auth header
   */
  getHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { 'x-uigen-auth': this.token };
  }
  
  /**
   * Check authentication status
   * Requirement 4.4: Return true if token exists
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.token.trim() !== '';
  }
  
  /**
   * Serialize for storage
   * Requirement 4.5: Return object containing token
   */
  serialize(): SerializedAuthData {
    return {
      type: this.type,
      token: this.token || ''
    };
  }
  
  /**
   * Restore from storage
   * Requirement 4.6: Restore token from data
   */
  deserialize(data: SerializedAuthData): void {
    if (data.type !== this.type) {
      console.error(`Type mismatch: expected ${this.type}, got ${data.type}`);
      return;
    }
    
    this.token = typeof data.token === 'string' ? data.token : null;
  }
  
  /**
   * Clear authentication state
   * Requirement 4.7: Remove stored token
   */
  clear(): void {
    this.token = null;
  }
  
  /**
   * Type guard for BearerCredentials validation
   * Validates credentials structure at runtime
   */
  private isBearerCredentials(creds: unknown): creds is BearerCredentials {
    return (
      typeof creds === 'object' &&
      creds !== null &&
      'token' in creds &&
      typeof (creds as any).token === 'string'
    );
  }
}
