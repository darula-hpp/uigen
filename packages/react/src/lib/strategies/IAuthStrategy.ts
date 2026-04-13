/**
 * Authentication result returned by authenticate method
 */
export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Serialized authentication data for storage
 */
export interface SerializedAuthData {
  type: string;
  [key: string]: unknown;
}

/**
 * Auth strategy interface for authentication behavior
 * Requirement 3: Define Auth Strategy Interface
 */
export interface IAuthStrategy {
  /**
   * Strategy type identifier
   * Requirement 3.1: Define readonly type property
   */
  readonly type: string;
  
  /**
   * Authenticate with provided credentials
   * Requirement 3.2: Define authenticate method
   */
  authenticate(credentials: unknown): Promise<AuthResult>;
  
  /**
   * Get HTTP headers for API requests
   * Requirement 3.3: Define getHeaders method
   */
  getHeaders(): Record<string, string>;
  
  /**
   * Check if currently authenticated
   * Requirement 3.4: Define isAuthenticated method
   */
  isAuthenticated(): boolean;
  
  /**
   * Serialize state for storage
   * Requirement 3.5: Define serialize method
   */
  serialize(): SerializedAuthData;
  
  /**
   * Restore state from storage
   * Requirement 3.6: Define deserialize method
   */
  deserialize(data: SerializedAuthData): void;
  
  /**
   * Clear authentication state
   * Requirement 3.7: Define clear method
   */
  clear(): void;
}

/**
 * Bearer token credentials
 */
export interface BearerCredentials {
  token: string;
}

/**
 * API key credentials
 */
export interface ApiKeyCredentials {
  apiKey: string;
  apiKeyName: string;
  apiKeyIn: 'header' | 'query';
}
