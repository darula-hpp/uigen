import { describe, it, expect } from 'vitest';
import { isFileField } from '../field-utils.js';
import type { FieldNode } from '../spec-parser.js';

describe('isFileField', () => {
  it('returns true for fields with type "file"', () => {
    const field: FieldNode = {
      key: 'avatar',
      label: 'Avatar',
      type: 'file',
      path: 'User.avatar',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(true);
  });
  
  it('returns true for fields with format "binary"', () => {
    const field: FieldNode = {
      key: 'document',
      label: 'Document',
      type: 'string',
      format: 'binary',
      path: 'User.document',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(true);
  });
  
  it('returns true for fields with both type "file" and format "binary"', () => {
    const field: FieldNode = {
      key: 'upload',
      label: 'Upload',
      type: 'file',
      format: 'binary',
      path: 'User.upload',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(true);
  });
  
  it('returns false for non-file fields', () => {
    const field: FieldNode = {
      key: 'name',
      label: 'Name',
      type: 'string',
      path: 'User.name',
      required: true,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for fields with undefined format', () => {
    const field: FieldNode = {
      key: 'email',
      label: 'Email',
      type: 'string',
      format: undefined,
      path: 'User.email',
      required: true,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for fields with non-binary format', () => {
    const field: FieldNode = {
      key: 'createdAt',
      label: 'Created At',
      type: 'string',
      format: 'date-time',
      path: 'User.createdAt',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for number fields', () => {
    const field: FieldNode = {
      key: 'age',
      label: 'Age',
      type: 'number',
      path: 'User.age',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for boolean fields', () => {
    const field: FieldNode = {
      key: 'active',
      label: 'Active',
      type: 'boolean',
      path: 'User.active',
      required: false,
      annotations: {}
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for object fields', () => {
    const field: FieldNode = {
      key: 'address',
      label: 'Address',
      type: 'object',
      path: 'User.address',
      required: false,
      annotations: {},
      children: []
    };
    
    expect(isFileField(field)).toBe(false);
  });
  
  it('returns false for array fields', () => {
    const field: FieldNode = {
      key: 'tags',
      label: 'Tags',
      type: 'array',
      path: 'User.tags',
      required: false,
      annotations: {},
      children: []
    };
    
    expect(isFileField(field)).toBe(false);
  });
});
