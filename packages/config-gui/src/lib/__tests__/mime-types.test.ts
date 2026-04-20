import { describe, it, expect } from 'vitest';
import { MIME_TYPE_OPTIONS, MultiSelectOption } from '../mime-types';

describe('MIME_TYPE_OPTIONS', () => {
  it('should export an array of options', () => {
    expect(Array.isArray(MIME_TYPE_OPTIONS)).toBe(true);
    expect(MIME_TYPE_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should have all required properties for each option', () => {
    MIME_TYPE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('group');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
      expect(typeof option.group).toBe('string');
    });
  });

  it('should include Images group', () => {
    const imageOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Images');
    expect(imageOptions.length).toBeGreaterThan(0);
    
    // Check for wildcard
    expect(imageOptions.some(opt => opt.value === 'image/*')).toBe(true);
    
    // Check for common image types
    expect(imageOptions.some(opt => opt.value === 'image/jpeg')).toBe(true);
    expect(imageOptions.some(opt => opt.value === 'image/png')).toBe(true);
    expect(imageOptions.some(opt => opt.value === 'image/gif')).toBe(true);
    expect(imageOptions.some(opt => opt.value === 'image/webp')).toBe(true);
    expect(imageOptions.some(opt => opt.value === 'image/svg+xml')).toBe(true);
  });

  it('should include Documents group', () => {
    const docOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Documents');
    expect(docOptions.length).toBeGreaterThan(0);
    
    // Check for common document types
    expect(docOptions.some(opt => opt.value === 'application/pdf')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'application/msword')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'application/vnd.ms-excel')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'text/plain')).toBe(true);
    expect(docOptions.some(opt => opt.value === 'text/csv')).toBe(true);
  });

  it('should include Video group', () => {
    const videoOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Video');
    expect(videoOptions.length).toBeGreaterThan(0);
    
    // Check for wildcard
    expect(videoOptions.some(opt => opt.value === 'video/*')).toBe(true);
    
    // Check for common video types
    expect(videoOptions.some(opt => opt.value === 'video/mp4')).toBe(true);
    expect(videoOptions.some(opt => opt.value === 'video/webm')).toBe(true);
    expect(videoOptions.some(opt => opt.value === 'video/quicktime')).toBe(true);
  });

  it('should include Audio group', () => {
    const audioOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Audio');
    expect(audioOptions.length).toBeGreaterThan(0);
    
    // Check for wildcard
    expect(audioOptions.some(opt => opt.value === 'audio/*')).toBe(true);
    
    // Check for common audio types
    expect(audioOptions.some(opt => opt.value === 'audio/mpeg')).toBe(true);
    expect(audioOptions.some(opt => opt.value === 'audio/wav')).toBe(true);
    expect(audioOptions.some(opt => opt.value === 'audio/ogg')).toBe(true);
  });

  it('should include Archives group', () => {
    const archiveOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Archives');
    expect(archiveOptions.length).toBeGreaterThan(0);
    
    // Check for common archive types
    expect(archiveOptions.some(opt => opt.value === 'application/zip')).toBe(true);
    expect(archiveOptions.some(opt => opt.value === 'application/x-tar')).toBe(true);
    expect(archiveOptions.some(opt => opt.value === 'application/gzip')).toBe(true);
  });

  it('should include Other group', () => {
    const otherOptions = MIME_TYPE_OPTIONS.filter(opt => opt.group === 'Other');
    expect(otherOptions.length).toBeGreaterThan(0);
    
    // Check for common other types
    expect(otherOptions.some(opt => opt.value === 'application/json')).toBe(true);
    expect(otherOptions.some(opt => opt.value === 'application/xml')).toBe(true);
    expect(otherOptions.some(opt => opt.value === '*/*')).toBe(true);
  });

  it('should have descriptions for wildcards', () => {
    const wildcards = MIME_TYPE_OPTIONS.filter(opt => opt.value.includes('*'));
    
    wildcards.forEach((wildcard) => {
      expect(wildcard.description).toBeDefined();
      expect(typeof wildcard.description).toBe('string');
      expect(wildcard.description!.length).toBeGreaterThan(0);
    });
  });

  it('should have unique values', () => {
    const values = MIME_TYPE_OPTIONS.map(opt => opt.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should have all groups represented', () => {
    const groups = new Set(MIME_TYPE_OPTIONS.map(opt => opt.group));
    
    expect(groups.has('Images')).toBe(true);
    expect(groups.has('Documents')).toBe(true);
    expect(groups.has('Video')).toBe(true);
    expect(groups.has('Audio')).toBe(true);
    expect(groups.has('Archives')).toBe(true);
    expect(groups.has('Other')).toBe(true);
  });

  it('should have valid MIME type format', () => {
    MIME_TYPE_OPTIONS.forEach((option) => {
      // MIME types should be in format: type/subtype or */*
      const mimePattern = /^(\*|[a-z]+)\/(\*|[a-z0-9\-\+\.]+)$/i;
      expect(option.value).toMatch(mimePattern);
    });
  });
});
