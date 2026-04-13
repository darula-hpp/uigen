import type { IAuthStrategy, AuthResult } from './IAuthStrategy';
import type { IStorageStrategy } from './IStorageStrategy';

/**
 * Auth manager coordinating authentication and storage strategies
 * Requirement 6: Implement Auth Manager
 */
export class AuthManager {
  private static readonly STORAGE_KEY = 'uigen_auth';
  
  /**
   * Constructor accepting auth and storage strategies
   * Requirements 6.1, 6.7: Accept strategies and auto-restore
   */
  constructor(
    private authStrategy: IAuthStrategy,
    private storageStrategy: IStorageStrategy
  ) {
    // Requirement 6.7: Automatically restore state on initialization
    this.restore();
  }
  
  /**
   * Login: authenticate → serialize → save
   * Requirement 6.2: Call authenticate, serialize, and save
   */
  async login(credentials: unknown): Promise<AuthResult> {
    // Step 1: Authenticate with the auth strategy
    const result = await this.authStrategy.authenticate(credentials);
    
    if (!result.success) {
      return result;
    }
    
    // Step 2: Serialize the authenticated state
    const serialized = this.authStrategy.serialize();
    
    // Step 3: Save to storage (with error handling)
    try {
      this.storageStrategy.save(AuthManager.STORAGE_KEY, serialized);
    } catch (error) {
      // Requirement 6.8: Log errors and continue without throwing
      console.error('Failed to save auth state:', error);
    }
    
    return result;
  }
  
  /**
   * Logout: clear → remove
   * Requirement 6.3: Call clear and remove
   */
  logout(): void {
    // Step 1: Clear auth strategy state
    this.authStrategy.clear();
    
    // Step 2: Remove from storage (with error handling)
    try {
      this.storageStrategy.remove(AuthManager.STORAGE_KEY);
    } catch (error) {
      // Requirement 6.8: Log errors and continue without throwing
      console.error('Failed to remove auth state:', error);
    }
  }
  
  /**
   * Get headers for API requests
   * Requirement 6.4: Delegate to auth strategy
   */
  getHeaders(): Record<string, string> {
    return this.authStrategy.getHeaders();
  }
  
  /**
   * Check authentication status
   * Requirement 6.5: Delegate to auth strategy
   */
  isAuthenticated(): boolean {
    return this.authStrategy.isAuthenticated();
  }
  
  /**
   * Restore: load → deserialize
   * Requirement 6.6: Load from storage and deserialize
   */
  restore(): void {
    try {
      // Step 1: Load data from storage
      const data = this.storageStrategy.load(AuthManager.STORAGE_KEY);
      
      if (!data) {
        return;
      }
      
      // Step 2: Deserialize into auth strategy
      this.authStrategy.deserialize(data as any);
    } catch (error) {
      // Requirement 6.8: Log errors and continue without throwing
      console.error('Failed to restore auth state:', error);
    }
  }
}
