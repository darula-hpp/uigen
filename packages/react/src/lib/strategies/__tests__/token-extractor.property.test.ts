import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TokenExtractor } from '../TokenExtractor';

describe('TokenExtractor - Property Tests', () => {
  /**
   * Property 3: Token Extraction from Response Bodies
   * 
   * **Feature: credential-based-auth-strategy, Property 3**
   * 
   * For any response body containing a token at a specified JSON path 
   * (top-level or nested), the Token_Extractor SHALL successfully extract 
   * the token value when given the correct path.
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it('Property 3: extracts tokens from any valid JSON path', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // token value
        fc.oneof(
          fc.constant('token'),
          fc.constant('accessToken'),
          fc.constant('access_token'),
          fc.constant('bearerToken')
        ), // token field name
        (tokenValue, fieldName) => {
          // Test top-level token
          const topLevel = { [fieldName]: tokenValue };
          const extracted = TokenExtractor.extract(topLevel, fieldName);
          expect(extracted).toBe(tokenValue);
          
          // Test nested token (data.token)
          const nested = { data: { [fieldName]: tokenValue } };
          const extractedNested = TokenExtractor.extract(nested, `data.${fieldName}`);
          expect(extractedNested).toBe(tokenValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Token Extraction with Response Format Variations
   * 
   * **Feature: credential-based-auth-strategy, Property 11**
   * 
   * For any valid token value, when placed in a response body as either 
   * a JSON object or a JSON string (stringified), the Token_Extractor 
   * SHALL successfully extract the token value.
   * 
   * **Validates: Requirements 5.6**
   */
  it('Property 11: handles various response body formats', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // token value
        (tokenValue) => {
          // Test with direct object
          const directObject = { token: tokenValue };
          const extracted1 = TokenExtractor.extract(directObject, 'token');
          expect(extracted1).toBe(tokenValue);
          
          // Test with parsed JSON string
          const jsonString = JSON.stringify({ token: tokenValue });
          const parsedObject = JSON.parse(jsonString);
          const extracted2 = TokenExtractor.extract(parsedObject, 'token');
          expect(extracted2).toBe(tokenValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for invalid response bodies', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (tokenPath) => {
          expect(TokenExtractor.extract(null, tokenPath)).toBeNull();
          expect(TokenExtractor.extract(undefined, tokenPath)).toBeNull();
          expect(TokenExtractor.extract('not an object', tokenPath)).toBeNull();
          expect(TokenExtractor.extract(123, tokenPath)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null when token field is missing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (tokenPath, otherField) => {
          fc.pre(tokenPath !== otherField); // Ensure different fields
          
          const responseBody = { [otherField]: 'some value' };
          const extracted = TokenExtractor.extract(responseBody, tokenPath);
          expect(extracted).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('extracts refresh tokens from common field names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(
          fc.constant('refreshToken'),
          fc.constant('refresh_token'),
          fc.constant('refresh')
        ),
        (refreshValue, fieldName) => {
          // Test top-level refresh token
          const topLevel = { [fieldName]: refreshValue };
          const extracted = TokenExtractor.extractRefreshToken(topLevel);
          expect(extracted).toBe(refreshValue);
          
          // Test nested refresh token
          const nested = { data: { [fieldName]: refreshValue } };
          const extractedNested = TokenExtractor.extractRefreshToken(nested);
          expect(extractedNested).toBe(refreshValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
