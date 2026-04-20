/**
 * Tests for FileSizeInput component - reopening with saved values
 * 
 * These tests verify that when a file size is saved and then the modal is reopened,
 * the value is displayed in the appropriate unit (not always in bytes).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FileSizeInput } from '../FileSizeInput.js';

describe('FileSizeInput - Reopening with saved values', () => {
  it('should display 5 MB when reopened with 5242880 bytes', async () => {
    const onChange = vi.fn();
    
    render(
      <FileSizeInput
        value={5242880} // 5 MB in bytes
        onChange={onChange}
        label="Maximum File Size"
      />
    );
    
    // Wait for useEffect to run and set display value
    await waitFor(() => {
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      expect(input.value).toBe('5');
    });
    
    // Check that unit is MB
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    expect(unitSelect.value).toBe('MB');
  });
  
  it('should display 10 MB when reopened with 10485760 bytes', async () => {
    const onChange = vi.fn();
    
    render(
      <FileSizeInput
        value={10485760} // 10 MB in bytes
        onChange={onChange}
        label="Maximum File Size"
      />
    );
    
    await waitFor(() => {
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      expect(input.value).toBe('10');
    });
    
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    expect(unitSelect.value).toBe('MB');
  });
  
  it('should display 1 GB when reopened with 1073741824 bytes', async () => {
    const onChange = vi.fn();
    
    render(
      <FileSizeInput
        value={1073741824} // 1 GB in bytes
        onChange={onChange}
        label="Maximum File Size"
      />
    );
    
    await waitFor(() => {
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      expect(input.value).toBe('1');
    });
    
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    expect(unitSelect.value).toBe('GB');
  });
  
  it('should display 500 KB when reopened with 512000 bytes', async () => {
    const onChange = vi.fn();
    
    render(
      <FileSizeInput
        value={512000} // 500 KB in bytes
        onChange={onChange}
        label="Maximum File Size"
      />
    );
    
    await waitFor(() => {
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      expect(input.value).toBe('500');
    });
    
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    expect(unitSelect.value).toBe('KB');
  });
  
  it('should not show bytes option in unit dropdown', () => {
    const onChange = vi.fn();
    
    render(
      <FileSizeInput
        value={5242880}
        onChange={onChange}
        label="Maximum File Size"
      />
    );
    
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    const options = Array.from(unitSelect.options).map(opt => opt.value);
    
    expect(options).toEqual(['KB', 'MB', 'GB']);
    expect(options).not.toContain('B');
  });
});
