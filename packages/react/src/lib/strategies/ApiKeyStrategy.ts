import type { IAuthStrategy, AuthResult, SerializedAuthData, ApiKeyCredentials } from './IAuthStrategy';

/**
 * API Key authentication strategy
 * Requirement 5: Implement API Key Strategy
 */
export class ApiKeyStrategy implements IAuthStrategy {
  readonly type = 'apiKey'; // Requirement 5.1
  private apiKey: string | null = null;
  private apiKeyName: string | null = null;
  private apiKeyIn: 'header' | 'query' | null = null;
  
  /**
   * Authenticate with API key credentials
   * Requirements 5.2, 5.8: Store credentials, validate non-empty
   */
  async authenticate(credentials: unknown): Promise<AuthResult> {
    if (!this.isApiKeyCredentials(credentials)) {
      return { success: false, error: 'Invalid credentials format' };
    }
    
    const { apiKey, apiKeyName, apiKeyIn } = credentials;
    
    // Requirement 5.8: Reject missing required parameters
    if (!apiKey || apiKey.trim() === '') {
      return { success: false, error: 'API key cannot be empty' };
    }
    
    if (!apiKeyName || apiKeyName.trim() === '') {
      return { success: false, error: 'API key name cannot be empty' };
    }
    
    if (!apiKeyIn) {
      return { success: false, error: 'API key location (apiKeyIn) cannot be empty' };
    }
    
    this.apiKey = apiKey;
    this.apiKeyName = apiKeyName;
    this.apiKeyIn = apiKeyIn;
    return { success: true };
  }
  
  /**
   * Get headers for proxy injection
   * Requirement 5.3: Return x-uigen-api-key-* headers
   */
  getHeaders(): Record<string, string> {
    if (!this.apiKey || !this.apiKeyName || !this.apiKeyIn) return {};
    return {
      'x-uigen-api-key': this.apiKey,
      'x-uigen-api-key-name': this.apiKeyName,
      'x-uigen-api-key-in': this.apiKeyIn
    };
  }
  
  /**
   * Check authentication status
   * Requirement 5.4: Return true if apiKey and apiKeyName exist
   */
  isAuthenticated(): boolean {
    return (
      this.apiKey !== null && 
      this.apiKey.trim() !== '' &&
      this.apiKeyName !== null && 
      this.apiKeyName.trim() !== ''
    );
  }
  
  /**
   * Serialize for storage
   * Requirement 5.5: Return object containing apiKey, apiKeyName, and apiKeyIn
   */
  serialize(): SerializedAuthData {
    return {
      type: this.type,
      apiKey: this.apiKey || '',
      apiKeyName: this.apiKeyName || '',
      apiKeyIn: this.apiKeyIn || 'header'
    };
  }
  
  /**
   * Restore from storage
   * Requirement 5.6: Restore apiKey, apiKeyName, and apiKeyIn from data
   */
  deserialize(data: SerializedAuthData): void {
    if (data.type !== this.type) {
      console.error(`Type mismatch: expected ${this.type}, got ${data.type}`);
      return;
    }
    
    this.apiKey = typeof data.apiKey === 'string' ? data.apiKey : null;
    this.apiKeyName = typeof data.apiKeyName === 'string' ? data.apiKeyName : null;
    this.apiKeyIn = (data.apiKeyIn === 'header' || data.apiKeyIn === 'query') ? data.apiKeyIn : null;
  }
  
  /**
   * Clear authentication state
   * Requirement 5.7: Remove all stored values
   */
  clear(): void {
    this.apiKey = null;
    this.apiKeyName = null;
    this.apiKeyIn = null;
  }
  
  /**
   * Type guard for ApiKeyCredentials validation
   * Validates credentials structure at runtime
   */
  private isApiKeyCredentials(creds: unknown): creds is ApiKeyCredentials {
    return (
      typeof creds === 'object' &&
      creds !== null &&
      'apiKey' in creds &&
      typeof (creds as any).apiKey === 'string' &&
      'apiKeyName' in creds &&
      typeof (creds as any).apiKeyName === 'string' &&
      'apiKeyIn' in creds &&
      ((creds as any).apiKeyIn === 'header' || (creds as any).apiKeyIn === 'query')
    );
  }
}
