/**
 * Token extraction utility
 * Handles various response formats and nested token fields
 */
export class TokenExtractor {
  /**
   * Extract token from response body using JSON path
   * 
   * @param responseBody - Parsed JSON response
   * @param tokenPath - JSON path to token (e.g., "token", "data.accessToken")
   * @returns Extracted token string or null
   */
  static extract(responseBody: unknown, tokenPath: string): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }
    
    // Handle simple top-level field
    if (!tokenPath.includes('.')) {
      const value = (responseBody as any)[tokenPath];
      return typeof value === 'string' ? value : null;
    }
    
    // Handle nested path (e.g., "data.token")
    const parts = tokenPath.split('.');
    let current: any = responseBody;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return null;
      }
      current = current[part];
    }
    
    return typeof current === 'string' ? current : null;
  }
  
  /**
   * Extract refresh token from response body
   * Looks for common refresh token field names
   */
  static extractRefreshToken(responseBody: unknown): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }
    
    const body = responseBody as Record<string, any>;
    
    // Check common field names
    for (const field of ['refreshToken', 'refresh_token', 'refresh']) {
      if (typeof body[field] === 'string') {
        return body[field];
      }
    }
    
    // Check nested in data object
    if (body.data && typeof body.data === 'object') {
      for (const field of ['refreshToken', 'refresh_token', 'refresh']) {
        if (typeof body.data[field] === 'string') {
          return body.data[field];
        }
      }
    }
    
    return null;
  }
}
