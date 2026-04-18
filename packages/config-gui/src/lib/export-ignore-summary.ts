/**
 * Export Ignore Summary Utility
 * 
 * Generates a markdown summary of all ignore configurations in the spec.
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import type { IgnoreState } from './ignore-state-calculator.js';

export interface IgnoredElement {
  path: string;
  name: string;
  type: 'property' | 'schema' | 'parameter' | 'requestBody' | 'response' | 'operation' | 'path';
  annotationValue: boolean;
  source: 'explicit' | 'inherited';
  inheritedFrom?: string;
}

/**
 * Generate a markdown summary of all ignored elements
 * 
 * The summary includes:
 * - Element path
 * - Element type
 * - Annotation value (true/false)
 * - Annotation source (explicit/inherited)
 * - Elements grouped by type
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4
 * 
 * @param elements - Array of ignored elements
 * @param specName - Name of the spec (optional)
 * @returns Markdown string
 */
export function generateIgnoreSummaryMarkdown(
  elements: IgnoredElement[],
  specName?: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  let markdown = `# Ignore Configuration Summary\n\n`;
  
  if (specName) {
    markdown += `**Spec:** ${specName}\n\n`;
  }
  
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `**Total Ignored Elements:** ${elements.length}\n\n`;
  markdown += `---\n\n`;

  // Group elements by type
  const groupedElements = groupElementsByType(elements);

  // Generate sections for each type
  const typeOrder: Array<IgnoredElement['type']> = [
    'schema',
    'property',
    'parameter',
    'requestBody',
    'response',
    'operation',
    'path'
  ];

  const typeLabels: Record<IgnoredElement['type'], string> = {
    schema: 'Ignored Schemas',
    property: 'Ignored Properties',
    parameter: 'Ignored Parameters',
    requestBody: 'Ignored Request Bodies',
    response: 'Ignored Responses',
    operation: 'Ignored Operations',
    path: 'Ignored Paths'
  };

  for (const type of typeOrder) {
    const elementsOfType = groupedElements[type];
    if (!elementsOfType || elementsOfType.length === 0) {
      continue;
    }

    markdown += `## ${typeLabels[type]}\n\n`;
    markdown += `**Count:** ${elementsOfType.length}\n\n`;

    // Create table
    markdown += `| Name | Path | Value | Source | Inherited From |\n`;
    markdown += `|------|------|-------|--------|----------------|\n`;

    for (const element of elementsOfType) {
      const inheritedFromDisplay = element.inheritedFrom || 'N/A';
      markdown += `| ${element.name} | \`${element.path}\` | ${element.annotationValue} | ${element.source} | ${inheritedFromDisplay} |\n`;
    }

    markdown += `\n`;
  }

  // Add summary statistics
  markdown += `---\n\n`;
  markdown += `## Summary Statistics\n\n`;
  
  const explicitCount = elements.filter(e => e.source === 'explicit').length;
  const inheritedCount = elements.filter(e => e.source === 'inherited').length;
  
  markdown += `- **Explicit Annotations:** ${explicitCount}\n`;
  markdown += `- **Inherited States:** ${inheritedCount}\n`;
  markdown += `\n`;

  for (const type of typeOrder) {
    const count = groupedElements[type]?.length || 0;
    if (count > 0) {
      markdown += `- **${typeLabels[type]}:** ${count}\n`;
    }
  }

  return markdown;
}

/**
 * Group elements by type
 */
function groupElementsByType(
  elements: IgnoredElement[]
): Record<IgnoredElement['type'], IgnoredElement[]> {
  const grouped: Record<string, IgnoredElement[]> = {
    schema: [],
    property: [],
    parameter: [],
    requestBody: [],
    response: [],
    operation: [],
    path: []
  };

  for (const element of elements) {
    grouped[element.type].push(element);
  }

  return grouped as Record<IgnoredElement['type'], IgnoredElement[]>;
}

/**
 * Download the markdown summary as a file
 * 
 * Requirements: 18.5
 * 
 * @param markdown - The markdown content
 * @param filename - Optional custom filename (defaults to ignore-summary-[timestamp].md)
 */
export function downloadIgnoreSummary(markdown: string, filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const defaultFilename = `ignore-summary-${timestamp}.md`;
  const finalFilename = filename || defaultFilename;

  // Create a blob with the markdown content
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert elements with ignore states to IgnoredElement format
 * 
 * This helper function extracts only the ignored elements (effective = true)
 * and formats them for the summary export.
 * 
 * @param elements - Array of elements with ignore states
 * @returns Array of ignored elements ready for export
 */
export function extractIgnoredElements(
  elements: Array<{
    path: string;
    name: string;
    type: IgnoredElement['type'];
    ignoreState: IgnoreState;
  }>
): IgnoredElement[] {
  return elements
    .filter(element => element.ignoreState.effective === true)
    .map(element => ({
      path: element.path,
      name: element.name,
      type: element.type,
      annotationValue: element.ignoreState.explicit ?? true,
      source: element.ignoreState.source === 'explicit' ? 'explicit' : 'inherited',
      inheritedFrom: element.ignoreState.inheritedFrom
    }));
}
