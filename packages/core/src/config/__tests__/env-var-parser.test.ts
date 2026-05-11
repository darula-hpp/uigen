/**
 * Unit tests for Environment Variable Parser
 */

import { describe, it, expect } from 'vitest';
import { EnvVarParser, EnvVarParseError } from '../env-var-parser.js';

describe('EnvVarParser', () => {
  const parser = new EnvVarParser();
  
  describe('parse', () => {
    it('should parse a single environment variable reference', () => {
      const result = parser.parse('${PORT}');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toEqual({
        name: 'PORT',
        raw: '${PORT}',
        start: 0,
        end: 7,
      });
    });
    
    it('should parse multiple environment variable references', () => {
      const result = parser.parse('${HOST}:${PORT}');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(2);
      expect(result.references[0].name).toBe('HOST');
      expect(result.references[1].name).toBe('PORT');
    });
    
    it('should parse references at different positions', () => {
      const result = parser.parse('http://${HOST}:${PORT}/api');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(2);
      expect(result.references[0].start).toBe(7);
      expect(result.references[1].start).toBe(15);
    });
    
    it('should return empty result for strings without references', () => {
      const result = parser.parse('no references here');
      
      expect(result.hasReferences).toBe(false);
      expect(result.references).toHaveLength(0);
    });
    
    it('should support variable names with numbers', () => {
      const result = parser.parse('${VAR123}');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references[0].name).toBe('VAR123');
    });
    
    it('should support variable names with underscores', () => {
      const result = parser.parse('${MY_VAR_NAME}');
      
      expect(result.hasReferences).toBe(true);
      expect(result.references[0].name).toBe('MY_VAR_NAME');
    });
    
    it('should throw error for missing closing brace', () => {
      expect(() => parser.parse('${INCOMPLETE')).toThrow(EnvVarParseError);
      expect(() => parser.parse('${INCOMPLETE')).toThrow(/missing closing brace/);
    });
    
    it('should throw error for empty variable name', () => {
      expect(() => parser.parse('${}')).toThrow(EnvVarParseError);
      expect(() => parser.parse('${}')).toThrow(/empty variable name/);
    });
    
    it('should throw error for invalid variable name (lowercase)', () => {
      expect(() => parser.parse('${lowercase}')).toThrow(EnvVarParseError);
      expect(() => parser.parse('${lowercase}')).toThrow(/invalid variable name/);
    });
    
    it('should throw error for invalid variable name (special chars)', () => {
      expect(() => parser.parse('${VAR-NAME}')).toThrow(EnvVarParseError);
      expect(() => parser.parse('${VAR-NAME}')).toThrow(/invalid variable name/);
    });
  });
  
  describe('format', () => {
    it('should format a variable name into ${VAR} syntax', () => {
      expect(parser.format('PORT')).toBe('${PORT}');
    });
    
    it('should format variable names with numbers', () => {
      expect(parser.format('VAR123')).toBe('${VAR123}');
    });
    
    it('should format variable names with underscores', () => {
      expect(parser.format('MY_VAR')).toBe('${MY_VAR}');
    });
  });
  
  describe('isValidVarName', () => {
    it('should validate uppercase letters', () => {
      expect(parser.isValidVarName('PORT')).toBe(true);
      expect(parser.isValidVarName('MY_VAR')).toBe(true);
    });
    
    it('should validate numbers', () => {
      expect(parser.isValidVarName('VAR123')).toBe(true);
    });
    
    it('should validate underscores', () => {
      expect(parser.isValidVarName('MY_VAR_NAME')).toBe(true);
    });
    
    it('should reject lowercase letters', () => {
      expect(parser.isValidVarName('lowercase')).toBe(false);
    });
    
    it('should reject special characters', () => {
      expect(parser.isValidVarName('VAR-NAME')).toBe(false);
      expect(parser.isValidVarName('VAR.NAME')).toBe(false);
      expect(parser.isValidVarName('VAR NAME')).toBe(false);
    });
    
    it('should reject empty string', () => {
      expect(parser.isValidVarName('')).toBe(false);
    });
  });
  
  describe('round-trip', () => {
    it('should preserve variable name through format and parse cycle', () => {
      const varName = 'MY_VAR_123';
      const formatted = parser.format(varName);
      const parsed = parser.parse(formatted);
      
      expect(parsed.references).toHaveLength(1);
      expect(parsed.references[0].name).toBe(varName);
    });
  });
});
