import type { Parameter, PaginationHint } from '../ir/types.js';

/**
 * PaginationDetector analyzes operation parameters to detect pagination strategies.
 * 
 * Supports three pagination styles:
 * - offset: Uses limit + offset parameters
 * - cursor: Uses cursor or next parameters
 * - page: Uses page + pageSize/per_page parameters
 * 
 * **Validates: Requirements 1.9, 6.1-6.5**
 */
export class PaginationDetector {
  /**
   * Detects pagination strategy from operation parameters.
   * 
   * @param parameters - Array of operation parameters
   * @returns PaginationHint if pagination detected, null otherwise
   */
  detect(parameters: Parameter[]): PaginationHint | null {
    const paramNames = parameters.map(p => p.name.toLowerCase());
    
    // Detect offset pagination (limit + offset)
    if (paramNames.includes('limit') && paramNames.includes('offset')) {
      return {
        style: 'offset',
        params: {
          limit: this.findExactParamName(parameters, 'limit'),
          offset: this.findExactParamName(parameters, 'offset')
        }
      };
    }
    
    // Detect cursor pagination (cursor or next)
    if (paramNames.includes('cursor')) {
      return {
        style: 'cursor',
        params: {
          cursor: this.findExactParamName(parameters, 'cursor')
        }
      };
    }
    
    if (paramNames.includes('next')) {
      return {
        style: 'cursor',
        params: {
          cursor: this.findExactParamName(parameters, 'next')
        }
      };
    }
    
    // Detect page-based pagination (page + pageSize/per_page/perpage)
    if (paramNames.includes('page')) {
      const pageSizeParam = this.findPageSizeParam(parameters, paramNames);
      if (pageSizeParam) {
        return {
          style: 'page',
          params: {
            page: this.findExactParamName(parameters, 'page'),
            pageSize: pageSizeParam
          }
        };
      }
    }
    
    return null;
  }
  
  /**
   * Finds the exact parameter name (preserving case) from the parameters array.
   */
  private findExactParamName(parameters: Parameter[], searchName: string): string {
    const param = parameters.find(p => p.name.toLowerCase() === searchName.toLowerCase());
    return param?.name || searchName;
  }
  
  /**
   * Finds the page size parameter name from common variations.
   */
  private findPageSizeParam(parameters: Parameter[], paramNames: string[]): string | null {
    const pageSizeVariations = ['pagesize', 'per_page', 'perpage'];
    
    for (const variation of pageSizeVariations) {
      if (paramNames.includes(variation)) {
        return this.findExactParamName(parameters, variation);
      }
    }
    
    return null;
  }
}
