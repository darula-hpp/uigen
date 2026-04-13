import type { IAuthStrategy, AuthResult, SerializedAuthData } from './IAuthStrategy';
import { BearerStrategy } from './BearerStrategy';
import { TokenExtractor } from './TokenExtractor';

/**
 * Credential-based authentication credentials
 */
export interface CredentialAuthCredentials {
  username: string;
  password: string;
  loginEndpoint: string;
  tokenPath?: string;
}

/**
 * Credential authentication strategy
 * Handles username/password login flows with token extraction
 * Requirement 4: Implement Credential Auth Strategy
 */
export class CredentialStrategy implements IAuthStrategy {
  readonly type = 'credential';
  
  private bearerStrategy: BearerStrategy;
  private loginEndpoint: string | null = null;
  private tokenPath: string = 'token';
  private refreshToken: string | null = null;
  private refreshEndpoint: string | null = null;
  
  constructor() {
    this.bearerStrategy = new BearerStrategy();
  }
  
  /**
   * Authenticate with username and password
   * Requirements 4.2, 4.3, 4.4, 4.6, 4.7
   */
  async authenticate(credentials: unknown): Promise<AuthResult> {
    if (!this.isCredentialAuthCredentials(credentials)) {
      return { success: false, error: 'Invalid credentials format' };
    }
    
    const { username, password, loginEndpoint, tokenPath } = credentials;
    
    // Requirement 4.6: Validate non-empty credentials
    if (!username || username.trim() === '') {
      return { success: false, error: 'Username cannot be empty' };
    }
    
    if (!password || password.trim() === '') {
      return { success: false, error: 'Password cannot be empty' };
    }
    
    // Requirement 15.1, 15.2: Validate login endpoint
    if (!loginEndpoint || loginEndpoint.trim() === '') {
      return { success: false, error: 'Login endpoint not configured' };
    }
    
    // Store configuration
    this.loginEndpoint = loginEndpoint;
    this.tokenPath = tokenPath || 'token';
    
    try {
      // Requirement 4.2: POST credentials to login endpoint
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      // Requirement 9: Handle HTTP errors
      if (!response.ok) {
        return this.handleLoginError(response.status, await response.text());
      }
      
      // Requirement 15.3: Validate JSON response
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch (error) {
        return { 
          success: false, 
          error: 'Invalid response format from login endpoint' 
        };
      }
      
      // Requirement 4.3, 5: Extract token from response
      const token = TokenExtractor.extract(responseBody, this.tokenPath);
      
      if (!token) {
        // Requirement 9.7: Token extraction failure
        return { 
          success: false, 
          error: 'Login succeeded but token not found in response' 
        };
      }
      
      // Requirement 12.1: Extract refresh token if present
      this.refreshToken = TokenExtractor.extractRefreshToken(responseBody);
      
      // Requirement 4.5, 6.2: Delegate to Bearer strategy
      const bearerResult = await this.bearerStrategy.authenticate({ token });
      
      return bearerResult;
      
    } catch (error) {
      // Requirement 9.5: Network errors
      return { 
        success: false, 
        error: 'Network error - please check your connection' 
      };
    }
  }
  
  /**
   * Handle login HTTP errors with user-friendly messages
   * Requirement 9: Handle Login Network Errors
   */
  private handleLoginError(status: number, responseText: string): AuthResult {
    // Try to extract error message from response
    let errorMessage: string | undefined;
    try {
      const body = JSON.parse(responseText);
      errorMessage = body.error || body.message;
    } catch {
      // Response is not JSON, use default messages
    }
    
    // Requirement 9.6: Use error message from response if available
    if (errorMessage) {
      return { success: false, error: errorMessage };
    }
    
    // Default error messages based on status code
    switch (status) {
      case 401:
        return { success: false, error: 'Invalid username or password' };
      case 403:
        return { success: false, error: 'Access forbidden' };
      case 404:
        return { success: false, error: 'Login endpoint not found' };
      case 500:
        return { success: false, error: 'Server error occurred' };
      default:
        return { success: false, error: `Login failed with status ${status}` };
    }
  }
  
  /**
   * Get headers for API requests
   * Requirements 6.3, 11.1: Delegate to Bearer strategy
   */
  getHeaders(): Record<string, string> {
    return this.bearerStrategy.getHeaders();
  }
  
  /**
   * Check authentication status
   * Requirement 6.4: Delegate to Bearer strategy
   */
  isAuthenticated(): boolean {
    return this.bearerStrategy.isAuthenticated();
  }
  
  /**
   * Serialize for storage
   * Requirements 6.5, 10.1, 12.7, 14.2
   */
  serialize(): SerializedAuthData {
    const bearerData = this.bearerStrategy.serialize();
    
    return {
      type: this.type,
      token: bearerData.token,
      loginEndpoint: this.loginEndpoint || '',
      tokenPath: this.tokenPath,
      refreshToken: this.refreshToken || undefined
    };
  }
  
  /**
   * Restore from storage
   * Requirements 6.6, 10.3, 14.4, 14.5
   */
  deserialize(data: SerializedAuthData): void {
    if (data.type !== this.type) {
      console.error(`Type mismatch: expected ${this.type}, got ${data.type}`);
      return;
    }
    
    try {
      // Restore configuration
      this.loginEndpoint = typeof data.loginEndpoint === 'string' ? data.loginEndpoint : null;
      this.tokenPath = typeof data.tokenPath === 'string' ? data.tokenPath : 'token';
      this.refreshToken = typeof data.refreshToken === 'string' ? data.refreshToken : null;
      
      // Requirement 6.6, 10.4: Restore Bearer strategy state
      this.bearerStrategy.deserialize({
        type: 'bearer',
        token: data.token
      });
    } catch (error) {
      // Requirement 14.5: Handle corrupted data gracefully
      console.error('Failed to deserialize credential strategy:', error);
      this.clear();
    }
  }
  
  /**
   * Clear authentication state
   * Requirement 6.7: Clear both credential and bearer state
   */
  clear(): void {
    this.bearerStrategy.clear();
    this.loginEndpoint = null;
    this.tokenPath = 'token';
    this.refreshToken = null;
    this.refreshEndpoint = null;
  }
  
  /**
   * Attempt to refresh the access token
   * Requirement 12: Support Token Refresh Flow
   */
  async refresh(): Promise<AuthResult> {
    if (!this.refreshToken || !this.refreshEndpoint) {
      return { success: false, error: 'Refresh token not available' };
    }
    
    try {
      // Requirement 12.3: POST refresh token to refresh endpoint
      const response = await fetch(this.refreshEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      
      if (!response.ok) {
        // Requirement 12.6: Clear state on refresh failure
        this.clear();
        return { success: false, error: 'Token refresh failed' };
      }
      
      const responseBody = await response.json();
      
      // Requirement 12.4: Extract new access token
      const newToken = TokenExtractor.extract(responseBody, this.tokenPath);
      
      if (!newToken) {
        this.clear();
        return { success: false, error: 'New token not found in refresh response' };
      }
      
      // Update bearer strategy with new token
      await this.bearerStrategy.authenticate({ token: newToken });
      
      // Update refresh token if provided
      const newRefreshToken = TokenExtractor.extractRefreshToken(responseBody);
      if (newRefreshToken) {
        this.refreshToken = newRefreshToken;
      }
      
      return { success: true };
      
    } catch (error) {
      this.clear();
      return { success: false, error: 'Network error during token refresh' };
    }
  }
  
  /**
   * Set refresh endpoint for token refresh flow
   */
  setRefreshEndpoint(endpoint: string): void {
    this.refreshEndpoint = endpoint;
  }
  
  /**
   * Type guard for credential validation
   */
  private isCredentialAuthCredentials(creds: unknown): creds is CredentialAuthCredentials {
    return (
      typeof creds === 'object' &&
      creds !== null &&
      'username' in creds &&
      typeof (creds as any).username === 'string' &&
      'password' in creds &&
      typeof (creds as any).password === 'string' &&
      'loginEndpoint' in creds &&
      typeof (creds as any).loginEndpoint === 'string'
    );
  }
}
