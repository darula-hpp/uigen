/**
 * Unit tests for export ignore summary utility
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateIgnoreSummaryMarkdown,
  downloadIgnoreSummary,
  extractIgnoredElements,
  type IgnoredElement
} from '../export-ignore-summary.js';
import type { IgnoreState } from '../ignore-state-calculator.js';

describe('generateIgnoreSummaryMarkdown', () => {
  it('should generate markdown with header and timestamp', () => {
    const elements: IgnoredElement[] = [];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('# Ignore Configuration Summary');
    expect(markdown).toContain('**Generated:**');
    expect(markdown).toContain('**Total Ignored Elements:** 0');
  });

  it('should include spec name when provided', () => {
    const elements: IgnoredElement[] = [];
    
    const markdown = generateIgnoreSummaryMarkdown(elements, 'petstore.yaml');
    
    expect(markdown).toContain('**Spec:** petstore.yaml');
  });

  it('should group elements by type', () => {
    const elements: IgnoredElement[] = [
      {
        path: 'components.schemas.User',
        name: 'User',
        type: 'schema',
        annotationValue: true,
        source: 'explicit'
      },
      {
        path: 'components.schemas.User.properties.email',
        name: 'email',
        type: 'property',
        annotationValue: true,
        source: 'explicit'
      }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('## Ignored Schemas');
    expect(markdown).toContain('## Ignored Properties');
    expect(markdown).toContain('**Count:** 1');
  });

  it('should create table with element details', () => {
    const elements: IgnoredElement[] = [
      {
        path: 'components.schemas.User.properties.email',
        name: 'email',
        type: 'property',
        annotationValue: true,
        source: 'explicit'
      }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('| Name | Path | Value | Source | Inherited From |');
    expect(markdown).toContain('| email | `components.schemas.User.properties.email` | true | explicit | N/A |');
  });

  it('should display inherited from path when available', () => {
    const elements: IgnoredElement[] = [
      {
        path: 'components.schemas.User.properties.email',
        name: 'email',
        type: 'property',
        annotationValue: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User'
      }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('| email | `components.schemas.User.properties.email` | true | inherited | components.schemas.User |');
  });

  it('should include summary statistics', () => {
    const elements: IgnoredElement[] = [
      {
        path: 'path1',
        name: 'elem1',
        type: 'property',
        annotationValue: true,
        source: 'explicit'
      },
      {
        path: 'path2',
        name: 'elem2',
        type: 'property',
        annotationValue: true,
        source: 'inherited'
      },
      {
        path: 'path3',
        name: 'elem3',
        type: 'schema',
        annotationValue: true,
        source: 'explicit'
      }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('## Summary Statistics');
    expect(markdown).toContain('**Explicit Annotations:** 2');
    expect(markdown).toContain('**Inherited States:** 1');
    expect(markdown).toContain('**Ignored Properties:** 2');
    expect(markdown).toContain('**Ignored Schemas:** 1');
  });

  it('should handle all element types', () => {
    const elements: IgnoredElement[] = [
      { path: 'p1', name: 'schema1', type: 'schema', annotationValue: true, source: 'explicit' },
      { path: 'p2', name: 'prop1', type: 'property', annotationValue: true, source: 'explicit' },
      { path: 'p3', name: 'param1', type: 'parameter', annotationValue: true, source: 'explicit' },
      { path: 'p4', name: 'req1', type: 'requestBody', annotationValue: true, source: 'explicit' },
      { path: 'p5', name: 'res1', type: 'response', annotationValue: true, source: 'explicit' },
      { path: 'p6', name: 'op1', type: 'operation', annotationValue: true, source: 'explicit' },
      { path: 'p7', name: 'path1', type: 'path', annotationValue: true, source: 'explicit' }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('## Ignored Schemas');
    expect(markdown).toContain('## Ignored Properties');
    expect(markdown).toContain('## Ignored Parameters');
    expect(markdown).toContain('## Ignored Request Bodies');
    expect(markdown).toContain('## Ignored Responses');
    expect(markdown).toContain('## Ignored Operations');
    expect(markdown).toContain('## Ignored Paths');
  });

  it('should skip empty sections', () => {
    const elements: IgnoredElement[] = [
      { path: 'p1', name: 'prop1', type: 'property', annotationValue: true, source: 'explicit' }
    ];
    
    const markdown = generateIgnoreSummaryMarkdown(elements);
    
    expect(markdown).toContain('## Ignored Properties');
    expect(markdown).not.toContain('## Ignored Schemas');
    expect(markdown).not.toContain('## Ignored Parameters');
  });
});

describe('downloadIgnoreSummary', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    // Mock URL methods (they don't exist in Node environment)
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a download link with correct attributes', () => {
    const markdown = '# Test Summary';
    
    downloadIgnoreSummary(markdown);
    
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should use default filename with timestamp', () => {
    const markdown = '# Test Summary';
    const mockLink = { href: '', download: '', click: vi.fn() };
    createElementSpy.mockReturnValue(mockLink as any);
    
    downloadIgnoreSummary(markdown);
    
    expect(mockLink.download).toMatch(/^ignore-summary-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
  });

  it('should use custom filename when provided', () => {
    const markdown = '# Test Summary';
    const mockLink = { href: '', download: '', click: vi.fn() };
    createElementSpy.mockReturnValue(mockLink as any);
    
    downloadIgnoreSummary(markdown, 'custom-summary.md');
    
    expect(mockLink.download).toBe('custom-summary.md');
  });

  it('should trigger download and cleanup', () => {
    const markdown = '# Test Summary';
    const mockLink = { href: '', download: '', click: vi.fn() };
    createElementSpy.mockReturnValue(mockLink as any);
    
    downloadIgnoreSummary(markdown);
    
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(mockLink.click).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('extractIgnoredElements', () => {
  const createMockElement = (
    name: string,
    path: string,
    type: IgnoredElement['type'],
    ignoreState: Partial<IgnoreState> = {}
  ) => ({
    name,
    path,
    type,
    ignoreState: {
      explicit: undefined,
      effective: false,
      source: 'default' as const,
      isOverride: false,
      ...ignoreState
    }
  });

  it('should extract only ignored elements', () => {
    const elements = [
      createMockElement('email', 'path1', 'property', { effective: true }),
      createMockElement('name', 'path2', 'property', { effective: false }),
      createMockElement('phone', 'path3', 'property', { effective: true })
    ];
    
    const result = extractIgnoredElements(elements);
    
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name)).toEqual(['email', 'phone']);
  });

  it('should format elements correctly', () => {
    const elements = [
      createMockElement('email', 'components.schemas.User.properties.email', 'property', {
        effective: true,
        explicit: true,
        source: 'explicit'
      })
    ];
    
    const result = extractIgnoredElements(elements);
    
    expect(result[0]).toEqual({
      path: 'components.schemas.User.properties.email',
      name: 'email',
      type: 'property',
      annotationValue: true,
      source: 'explicit',
      inheritedFrom: undefined
    });
  });

  it('should handle inherited state', () => {
    const elements = [
      createMockElement('email', 'path1', 'property', {
        effective: true,
        explicit: undefined,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User'
      })
    ];
    
    const result = extractIgnoredElements(elements);
    
    expect(result[0].source).toBe('inherited');
    expect(result[0].inheritedFrom).toBe('components.schemas.User');
  });

  it('should use true as default annotation value when explicit is undefined', () => {
    const elements = [
      createMockElement('email', 'path1', 'property', {
        effective: true,
        explicit: undefined,
        source: 'inherited'
      })
    ];
    
    const result = extractIgnoredElements(elements);
    
    expect(result[0].annotationValue).toBe(true);
  });

  it('should return empty array when no ignored elements', () => {
    const elements = [
      createMockElement('email', 'path1', 'property', { effective: false }),
      createMockElement('name', 'path2', 'property', { effective: false })
    ];
    
    const result = extractIgnoredElements(elements);
    
    expect(result).toHaveLength(0);
  });
});
