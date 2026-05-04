import type { LayoutConfig, LayoutMetadata } from '../ir/types.js';

/**
 * Merge two layout configurations with operation-level overriding document-level
 * 
 * This function implements the merging logic for layout configurations as specified
 * in Requirement 12.5. Operation-level values override document-level values, but
 * document-level values are preserved when not overridden.
 * 
 * @param documentConfig - Document-level layout configuration
 * @param operationConfig - Operation-level layout configuration (overrides)
 * @returns Merged layout configuration
 */
export function mergeLayoutConfigs(
  documentConfig: LayoutConfig | undefined,
  operationConfig: LayoutConfig | undefined
): LayoutConfig | undefined {
  // If no configs provided, return undefined
  if (!documentConfig && !operationConfig) {
    return undefined;
  }
  
  // If only operation config, return it
  if (!documentConfig && operationConfig) {
    return operationConfig;
  }
  
  // If only document config, return it
  if (documentConfig && !operationConfig) {
    return documentConfig;
  }
  
  // Both configs exist - merge them
  const merged: LayoutConfig = {
    // Operation type overrides document type
    type: operationConfig!.type,
    // Deep merge metadata
    metadata: mergeMetadata(documentConfig!.metadata, operationConfig!.metadata)
  };
  
  return merged;
}

/**
 * Deep merge two metadata objects
 * 
 * This function performs a deep merge of metadata objects, where operation-level
 * values override document-level values. Undefined values in the operation config
 * are treated as "not specified" and do not override document values.
 * 
 * @param documentMetadata - Document-level metadata
 * @param operationMetadata - Operation-level metadata (overrides)
 * @returns Merged metadata
 */
function mergeMetadata(
  documentMetadata: LayoutMetadata | undefined,
  operationMetadata: LayoutMetadata | undefined
): LayoutMetadata | undefined {
  // If no metadata, return undefined
  if (!documentMetadata && !operationMetadata) {
    return undefined;
  }
  
  // If only operation metadata, return it
  if (!documentMetadata && operationMetadata) {
    return operationMetadata;
  }
  
  // If only document metadata, return it
  if (documentMetadata && !operationMetadata) {
    return documentMetadata;
  }
  
  // Both exist - deep merge
  const merged: LayoutMetadata = { ...documentMetadata };
  
  // Merge operation metadata into document metadata
  for (const key in operationMetadata) {
    const opValue = operationMetadata[key];
    const docValue = documentMetadata![key];
    
    // Skip undefined values - they don't override
    if (opValue === undefined) {
      continue;
    }
    
    // If operation value is an object and document value is also an object, deep merge
    if (
      opValue !== null &&
      typeof opValue === 'object' &&
      !Array.isArray(opValue) &&
      docValue !== null &&
      typeof docValue === 'object' &&
      !Array.isArray(docValue)
    ) {
      // Deep merge nested objects, filtering out undefined values
      const mergedNested: Record<string, unknown> = { ...docValue };
      for (const nestedKey in opValue as Record<string, unknown>) {
        const nestedValue = (opValue as Record<string, unknown>)[nestedKey];
        if (nestedValue !== undefined) {
          mergedNested[nestedKey] = nestedValue;
        }
      }
      merged[key] = mergedNested;
    } else {
      // Otherwise, operation value overrides
      merged[key] = opValue;
    }
  }
  
  return merged;
}
