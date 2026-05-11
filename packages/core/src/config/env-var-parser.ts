/**
 * Environment Variable Parser
 * 
 * Parses strings for ${ENV_VAR_NAME} syntax and extracts variable names.
 */

/**
 * Represents a parsed environment variable reference
 */
export interface EnvVarReference {
  /** The environment variable name (e.g., "PORT" from "${PORT}") */
  name: string;
  
  /** The original text including delimiters (e.g., "${PORT}") */
  raw: string;
  
  /** Start position in the source string */
  start: number;
  
  /** End position in the source string */
  end: number;
}

/**
 * Result of parsing a string for environment variable references
 */
export interface ParseResult {
  /** List of environment variable references found */
  references: EnvVarReference[];
  
  /** Whether the string contains any references */
  hasReferences: boolean;
}

/**
 * Error thrown when malformed environment variable syntax is detected
 */
export class EnvVarParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
    public readonly malformedText: string
  ) {
    super(message);
    this.name = 'EnvVarParseError';
  }
}

/**
 * Environment Variable Parser
 * 
 * Parses strings for ${ENV_VAR_NAME} syntax and extracts variable names.
 */
export class EnvVarParser {
  private readonly pattern = /\$\{([A-Z0-9_]+)\}/g;
  
  /**
   * Parse a string and extract all environment variable references
   * 
   * @param input - The string to parse
   * @returns Parse result with all references found
   * @throws EnvVarParseError if malformed syntax is detected
   */
  parse(input: string): ParseResult {
    const references: EnvVarReference[] = [];
    
    // Check for malformed syntax
    this.validateSyntax(input);
    
    // Extract all valid references
    let match: RegExpExecArray | null;
    this.pattern.lastIndex = 0; // Reset regex state
    
    while ((match = this.pattern.exec(input)) !== null) {
      references.push({
        name: match[1],
        raw: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    
    return {
      references,
      hasReferences: references.length > 0,
    };
  }
  
  /**
   * Format an environment variable name into ${ENV_VAR_NAME} syntax
   * 
   * @param varName - The environment variable name
   * @returns Formatted reference string
   */
  format(varName: string): string {
    return `\${${varName}}`;
  }
  
  /**
   * Validate an environment variable name
   * 
   * Valid names contain only uppercase letters, numbers, and underscores
   * 
   * @param varName - The variable name to validate
   * @returns true if valid, false otherwise
   */
  isValidVarName(varName: string): boolean {
    return /^[A-Z0-9_]+$/.test(varName);
  }
  
  /**
   * Validate syntax for malformed references
   * 
   * @param input - The string to validate
   * @throws EnvVarParseError if malformed syntax is detected
   */
  private validateSyntax(input: string): void {
    // Check for incomplete references like ${, ${}, ${incomplete
    const dollarBraceIndex = input.indexOf('${');
    if (dollarBraceIndex === -1) {
      return; // No potential references
    }
    
    // Check each ${ occurrence
    let searchStart = 0;
    while (true) {
      const index = input.indexOf('${', searchStart);
      if (index === -1) break;
      
      // Find the closing brace
      const closingBrace = input.indexOf('}', index + 2);
      if (closingBrace === -1) {
        throw new EnvVarParseError(
          `Malformed environment variable syntax at position ${index}: missing closing brace`,
          index,
          input.substring(index, Math.min(index + 20, input.length))
        );
      }
      
      // Extract the content between ${ and }
      const content = input.substring(index + 2, closingBrace);
      
      // Check if it's empty
      if (content.length === 0) {
        throw new EnvVarParseError(
          `Malformed environment variable syntax at position ${index}: empty variable name`,
          index,
          input.substring(index, closingBrace + 1)
        );
      }
      
      // Check if it's a valid variable name
      if (!this.isValidVarName(content)) {
        throw new EnvVarParseError(
          `Malformed environment variable syntax at position ${index}: invalid variable name "${content}" (must contain only uppercase letters, numbers, and underscores)`,
          index,
          input.substring(index, closingBrace + 1)
        );
      }
      
      searchStart = closingBrace + 1;
    }
  }
}
