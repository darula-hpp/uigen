import { describe, it, expect } from 'vitest';
import { resolveLabel } from '../resolve-label';

describe('resolveLabel', () => {
  it('plain field name returns the field value as a string', () => {
    expect(resolveLabel('name', { name: 'Alice' })).toBe('Alice');
  });

  it('plain field name with number value returns string representation', () => {
    expect(resolveLabel('age', { age: 42 })).toBe('42');
  });

  it('single {placeholder} template is substituted correctly', () => {
    expect(resolveLabel('{name}', { name: 'Bob' })).toBe('Bob');
  });

  it('multi-placeholder template substitutes all placeholders', () => {
    expect(
      resolveLabel('{first_name} {last_name}', {
        first_name: 'Jane',
        last_name: 'Doe',
      })
    ).toBe('Jane Doe');
  });

  it('missing field in record resolves to empty string (plain)', () => {
    expect(resolveLabel('missing', {})).toBe('');
  });

  it('null field value resolves to empty string (plain)', () => {
    expect(resolveLabel('field', { field: null })).toBe('');
  });

  it('undefined field value resolves to empty string (plain)', () => {
    expect(resolveLabel('field', { field: undefined })).toBe('');
  });

  it('template with missing field resolves placeholder to empty string', () => {
    expect(resolveLabel('{first_name} {last_name}', { first_name: 'Jane' })).toBe('Jane ');
  });

  it('plain field name that does not exist in record returns empty string', () => {
    expect(resolveLabel('nonexistent', { other: 'value' })).toBe('');
  });
});
