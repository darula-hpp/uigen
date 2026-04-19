import { describe, it, expect } from 'vitest';

// Extract the helper functions for testing
function buildApiPathPatterns(ir: any): Set<string> {
  const patterns = new Set<string>();
  
  // Add all resource operation paths
  for (const resource of ir.resources || []) {
    for (const operation of resource.operations || []) {
      if (operation.path) {
        patterns.add(operation.path);
      }
    }
  }
  
  // Add auth endpoint paths
  const authEndpoints = [
    ...(ir.auth?.loginEndpoints || []),
    ...(ir.auth?.refreshEndpoints || []),
    ...(ir.auth?.passwordResetEndpoints || []),
    ...(ir.auth?.signUpEndpoints || [])
  ];
  
  for (const endpoint of authEndpoints) {
    if (endpoint.path) {
      patterns.add(endpoint.path);
    }
  }
  
  return patterns;
}

function isApiPath(urlPath: string, apiPatterns: Set<string>): boolean {
  // Remove /api prefix if present
  const cleanPath = urlPath.replace(/^\/api/, '');
  
  // Direct match
  if (apiPatterns.has(cleanPath)) {
    return true;
  }
  
  // Check against patterns with path parameters (e.g., /users/{id})
  for (const pattern of apiPatterns) {
    // Convert OpenAPI path pattern to regex: /users/{id} -> /users/[^/]+
    const regexPattern = pattern.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    
    if (regex.test(cleanPath)) {
      return true;
    }
  }
  
  return false;
}

describe('API Path Matching', () => {
  const mockIR = {
    resources: [
      {
        operations: [
          { path: '/users' },
          { path: '/users/{id}' },
          { path: '/meetings' },
          { path: '/meetings/{meetingId}/transcripts' },
          { path: '/meetings/{meetingId}/transcripts/{transcriptId}' }
        ]
      }
    ],
    auth: {
      loginEndpoints: [{ path: '/auth/login' }],
      signUpEndpoints: [{ path: '/auth/signup' }],
      passwordResetEndpoints: [{ path: '/auth/reset-password' }]
    }
  };

  const patterns = buildApiPathPatterns(mockIR);

  describe('buildApiPathPatterns', () => {
    it('should extract all resource operation paths', () => {
      expect(patterns.has('/users')).toBe(true);
      expect(patterns.has('/users/{id}')).toBe(true);
      expect(patterns.has('/meetings')).toBe(true);
      expect(patterns.has('/meetings/{meetingId}/transcripts')).toBe(true);
    });

    it('should extract all auth endpoint paths', () => {
      expect(patterns.has('/auth/login')).toBe(true);
      expect(patterns.has('/auth/signup')).toBe(true);
      expect(patterns.has('/auth/reset-password')).toBe(true);
    });

    it('should return correct count', () => {
      expect(patterns.size).toBe(8);
    });
  });

  describe('isApiPath', () => {
    it('should match exact paths without /api prefix', () => {
      expect(isApiPath('/users', patterns)).toBe(true);
      expect(isApiPath('/meetings', patterns)).toBe(true);
      expect(isApiPath('/auth/login', patterns)).toBe(true);
    });

    it('should match exact paths with /api prefix', () => {
      expect(isApiPath('/api/users', patterns)).toBe(true);
      expect(isApiPath('/api/meetings', patterns)).toBe(true);
      expect(isApiPath('/api/auth/login', patterns)).toBe(true);
    });

    it('should match paths with single path parameter', () => {
      expect(isApiPath('/users/123', patterns)).toBe(true);
      expect(isApiPath('/api/users/abc-def', patterns)).toBe(true);
      expect(isApiPath('/users/user-uuid-here', patterns)).toBe(true);
    });

    it('should match paths with multiple path parameters', () => {
      expect(isApiPath('/meetings/123/transcripts', patterns)).toBe(true);
      expect(isApiPath('/meetings/abc/transcripts/456', patterns)).toBe(true);
      expect(isApiPath('/api/meetings/meeting-1/transcripts/transcript-1', patterns)).toBe(true);
    });

    it('should not match non-API paths', () => {
      expect(isApiPath('/index.html', patterns)).toBe(false);
      expect(isApiPath('/assets/main.js', patterns)).toBe(false);
      expect(isApiPath('/favicon.ico', patterns)).toBe(false);
      expect(isApiPath('/api/nonexistent', patterns)).toBe(false);
    });

    it('should not match partial paths', () => {
      expect(isApiPath('/user', patterns)).toBe(false);
      expect(isApiPath('/users/123/extra', patterns)).toBe(false);
      expect(isApiPath('/meeting', patterns)).toBe(false);
    });

    it('should not match paths with slashes in parameter values', () => {
      // Path parameters shouldn't contain slashes
      expect(isApiPath('/users/123/456', patterns)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty IR', () => {
      const emptyPatterns = buildApiPathPatterns({ resources: [], auth: {} });
      expect(emptyPatterns.size).toBe(0);
      expect(isApiPath('/anything', emptyPatterns)).toBe(false);
    });

    it('should handle missing auth endpoints', () => {
      const irWithoutAuth = {
        resources: [{ operations: [{ path: '/users' }] }],
        auth: {}
      };
      const patternsWithoutAuth = buildApiPathPatterns(irWithoutAuth);
      expect(patternsWithoutAuth.size).toBe(1);
      expect(patternsWithoutAuth.has('/users')).toBe(true);
    });

    it('should handle paths with special characters in parameters', () => {
      expect(isApiPath('/users/user@example.com', patterns)).toBe(true);
      expect(isApiPath('/users/user-name_123', patterns)).toBe(true);
    });
  });
});
