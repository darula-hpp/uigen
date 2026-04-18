/**
 * Unit tests for search and filter utilities
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { describe, it, expect } from 'vitest';
import {
  searchElements,
  filterElements,
  searchAndFilter,
  matchesSearchAndFilter,
  type SearchableElement
} from '../search-filter-utils.js';
import type { IgnoreState } from '../ignore-state-calculator.js';

describe('searchElements', () => {
  const createMockElement = (
    name: string,
    path: string,
    ignoreState: Partial<IgnoreState> = {}
  ): SearchableElement => ({
    name,
    path,
    type: 'property',
    ignoreState: {
      explicit: undefined,
      effective: false,
      source: 'default',
      isOverride: false,
      ...ignoreState
    }
  });

  it('should return all elements when query is empty', () => {
    const elements = [
      createMockElement('email', 'components.schemas.User.properties.email'),
      createMockElement('name', 'components.schemas.User.properties.name')
    ];

    const result = searchElements(elements, '');
    expect(result).toEqual(elements);
  });

  it('should filter by element name (case-insensitive)', () => {
    const elements = [
      createMockElement('email', 'components.schemas.User.properties.email'),
      createMockElement('name', 'components.schemas.User.properties.name'),
      createMockElement('phone', 'components.schemas.User.properties.phone')
    ];

    const result = searchElements(elements, 'EMAIL');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('email');
  });

  it('should filter by element path (case-insensitive)', () => {
    const elements = [
      createMockElement('email', 'components.schemas.User.properties.email'),
      createMockElement('email', 'components.schemas.Admin.properties.email')
    ];

    const result = searchElements(elements, 'admin');
    expect(result).toHaveLength(1);
    expect(result[0].path).toContain('Admin');
  });

  it('should filter by annotation state keyword "ignored"', () => {
    const elements = [
      createMockElement('email', 'path1', { effective: true }),
      createMockElement('name', 'path2', { effective: false })
    ];

    const result = searchElements(elements, 'ignored');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('email');
  });

  it('should filter by annotation state keyword "active"', () => {
    const elements = [
      createMockElement('email', 'path1', { effective: true }),
      createMockElement('name', 'path2', { effective: false })
    ];

    const result = searchElements(elements, 'active');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('name');
  });

  it('should filter by annotation state keyword "inherited"', () => {
    const elements = [
      createMockElement('email', 'path1', { source: 'inherited' }),
      createMockElement('name', 'path2', { source: 'explicit' })
    ];

    const result = searchElements(elements, 'inherited');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('email');
  });

  it('should filter by annotation state keyword "explicit"', () => {
    const elements = [
      createMockElement('email', 'path1', { source: 'inherited' }),
      createMockElement('name', 'path2', { source: 'explicit' })
    ];

    const result = searchElements(elements, 'explicit');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('name');
  });

  it('should filter by annotation state keyword "override"', () => {
    const elements = [
      createMockElement('email', 'path1', { isOverride: true }),
      createMockElement('name', 'path2', { isOverride: false })
    ];

    const result = searchElements(elements, 'override');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('email');
  });

  it('should match partial keywords', () => {
    const elements = [
      createMockElement('email', 'path1', { effective: true })
    ];

    const result = searchElements(elements, 'ign');
    expect(result).toHaveLength(1);
  });

  it('should trim whitespace from query', () => {
    const elements = [
      createMockElement('email', 'components.schemas.User.properties.email')
    ];

    const result = searchElements(elements, '  email  ');
    expect(result).toHaveLength(1);
  });
});

describe('filterElements', () => {
  const createMockElement = (
    name: string,
    ignoreState: Partial<IgnoreState> = {}
  ): SearchableElement => ({
    name,
    path: `path.${name}`,
    type: 'property',
    ignoreState: {
      explicit: undefined,
      effective: false,
      source: 'default',
      isOverride: false,
      ...ignoreState
    }
  });

  it('should return all elements when filter is "all"', () => {
    const elements = [
      createMockElement('email', { effective: true }),
      createMockElement('name', { effective: false })
    ];

    const result = filterElements(elements, 'all');
    expect(result).toEqual(elements);
  });

  it('should filter ignored elements when filter is "ignored"', () => {
    const elements = [
      createMockElement('email', { effective: true }),
      createMockElement('name', { effective: false }),
      createMockElement('phone', { effective: true })
    ];

    const result = filterElements(elements, 'ignored');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name)).toEqual(['email', 'phone']);
  });

  it('should filter active elements when filter is "active"', () => {
    const elements = [
      createMockElement('email', { effective: true }),
      createMockElement('name', { effective: false }),
      createMockElement('phone', { effective: false })
    ];

    const result = filterElements(elements, 'active');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name)).toEqual(['name', 'phone']);
  });

  it('should filter override elements when filter is "overrides"', () => {
    const elements = [
      createMockElement('email', { isOverride: true }),
      createMockElement('name', { isOverride: false }),
      createMockElement('phone', { isOverride: true })
    ];

    const result = filterElements(elements, 'overrides');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name)).toEqual(['email', 'phone']);
  });
});

describe('searchAndFilter', () => {
  const createMockElement = (
    name: string,
    path: string,
    ignoreState: Partial<IgnoreState> = {}
  ): SearchableElement => ({
    name,
    path,
    type: 'property',
    ignoreState: {
      explicit: undefined,
      effective: false,
      source: 'default',
      isOverride: false,
      ...ignoreState
    }
  });

  it('should apply both filter and search', () => {
    const elements = [
      createMockElement('email', 'User.email', { effective: true }),
      createMockElement('name', 'User.name', { effective: true }),
      createMockElement('email', 'Admin.email', { effective: false })
    ];

    // Filter for ignored, search for "email"
    const result = searchAndFilter(elements, 'email', 'ignored');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('email');
    expect(result[0].path).toBe('User.email');
  });

  it('should return all elements when no filter or search applied', () => {
    const elements = [
      createMockElement('email', 'path1'),
      createMockElement('name', 'path2')
    ];

    const result = searchAndFilter(elements, '', 'all');
    expect(result).toEqual(elements);
  });

  it('should return empty array when no matches', () => {
    const elements = [
      createMockElement('email', 'path1', { effective: false })
    ];

    const result = searchAndFilter(elements, 'email', 'ignored');
    expect(result).toHaveLength(0);
  });
});

describe('matchesSearchAndFilter', () => {
  const createMockElement = (
    name: string,
    path: string,
    ignoreState: Partial<IgnoreState> = {}
  ): SearchableElement => ({
    name,
    path,
    type: 'property',
    ignoreState: {
      explicit: undefined,
      effective: false,
      source: 'default',
      isOverride: false,
      ...ignoreState
    }
  });

  it('should return true when element matches both search and filter', () => {
    const element = createMockElement('email', 'User.email', { effective: true });
    
    const result = matchesSearchAndFilter(element, 'email', 'ignored');
    expect(result).toBe(true);
  });

  it('should return false when element does not match filter', () => {
    const element = createMockElement('email', 'User.email', { effective: false });
    
    const result = matchesSearchAndFilter(element, 'email', 'ignored');
    expect(result).toBe(false);
  });

  it('should return false when element does not match search', () => {
    const element = createMockElement('email', 'User.email', { effective: true });
    
    const result = matchesSearchAndFilter(element, 'name', 'ignored');
    expect(result).toBe(false);
  });

  it('should return true when no search or filter applied', () => {
    const element = createMockElement('email', 'User.email');
    
    const result = matchesSearchAndFilter(element, '', 'all');
    expect(result).toBe(true);
  });
});
