/**
 * End-to-end tests for file size annotation workflow
 * 
 * These tests verify the complete flow:
 * 1. User opens file size modal
 * 2. User enters value in MB/GB
 * 3. Value is saved in bytes
 * 4. Badge displays formatted value
 * 5. Reopening modal shows value in appropriate unit (not bytes)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnnotationEditor } from '../components/VisualEditor/AnnotationEditor.js';
import { AppContext } from '../contexts/AppContext.js';
import type { AnnotationMetadata } from '../types/index.js';

// Mock annotation metadata for x-uigen-max-file-size
const mockAnnotations: AnnotationMetadata[] = [
  {
    name: 'x-uigen-max-file-size',
    description: 'Maximum allowed file size for uploads',
    targetType: 'field',
    parameterSchema: {
      type: 'number',
      description: 'Maximum file size in bytes',
      minimum: 1,
      maximum: 1073741824
    },
    examples: [
      { description: '5 MB limit', value: 5242880 },
      { description: '10 MB limit', value: 10485760 }
    ],
    applicableWhen: {
      type: 'file'
    }
  }
];

describe('File Size Annotation E2E', () => {
  const renderWithContext = (currentAnnotations: Record<string, unknown> = {}) => {
    const onAnnotationsChange = vi.fn();
    
    const mockState = {
      specStructure: null,
      config: null,
      annotations: mockAnnotations,
      cssConfig: null,
      isLoading: false,
      error: null
    };
    
    const mockDispatch = vi.fn();
    
    render(
      <AppContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <AnnotationEditor
          elementPath="CreateMeetingRequest.recording"
          elementType="field"
          currentAnnotations={currentAnnotations}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'file', format: 'binary' }}
        />
      </AppContext.Provider>
    );
    
    return { onAnnotationsChange };
  };
  
  it('should save value in bytes when user enters MB', async () => {
    const user = userEvent.setup();
    const { onAnnotationsChange } = renderWithContext();
    
    // Click "+ Add" button
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    await user.click(addButton);
    
    // Click "Max File Size" option
    const maxFileSizeOption = await screen.findByText('Max File Size');
    await user.click(maxFileSizeOption);
    
    // Modal should open with FileSizeInput
    await waitFor(() => {
      expect(screen.getByText('Maximum allowed file size for uploads')).toBeInTheDocument();
    });
    
    // Input should show default value (5) with MB unit
    const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    
    expect(input.value).toBe('5');
    expect(unitSelect.value).toBe('MB');
    
    // Change to 10 MB
    await user.clear(input);
    await user.type(input, '10');
    
    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    // Should save as bytes (10 * 1024 * 1024 = 10485760)
    await waitFor(() => {
      expect(onAnnotationsChange).toHaveBeenCalledWith({
        'x-uigen-max-file-size': 10485760
      });
    });
  });
  
  it('should display formatted value in badge after saving', async () => {
    // Render with saved value (5 MB = 5242880 bytes)
    renderWithContext({ 'x-uigen-max-file-size': 5242880 });
    
    // Badge should show "5.0 MB" not "5242880 B"
    const badge = screen.getByRole('button', { name: /edit max file size/i });
    expect(badge).toHaveTextContent('Max File Size: 5.0 MB');
    expect(badge).not.toHaveTextContent('5242880');
  });
  
  it('should reopen modal with value in MB, not bytes', async () => {
    const user = userEvent.setup();
    
    // Render with saved value (10 MB = 10485760 bytes)
    renderWithContext({ 'x-uigen-max-file-size': 10485760 });
    
    // Click badge to edit
    const badge = screen.getByRole('button', { name: /edit max file size/i });
    await user.click(badge);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Maximum allowed file size for uploads')).toBeInTheDocument();
    });
    
    // Input should show "10" with "MB" unit, NOT "10485760" with "B" unit
    const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
    const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
    
    await waitFor(() => {
      expect(input.value).toBe('10');
      expect(unitSelect.value).toBe('MB');
    });
    
    // Should NOT show bytes
    expect(input.value).not.toBe('10485760');
  });
  
  it('should handle GB values correctly', async () => {
    const user = userEvent.setup();
    
    // Render with saved value (1 GB = 1073741824 bytes)
    renderWithContext({ 'x-uigen-max-file-size': 1073741824 });
    
    // Badge should show "1.0 GB"
    const badge = screen.getByRole('button', { name: /edit max file size/i });
    expect(badge).toHaveTextContent('Max File Size: 1.0 GB');
    
    // Click to edit
    await user.click(badge);
    
    // Modal should show "1" GB
    await waitFor(() => {
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('1');
      expect(unitSelect.value).toBe('GB');
    });
  });
  
  it('should not show bytes option in dropdown', async () => {
    const user = userEvent.setup();
    const { onAnnotationsChange } = renderWithContext();
    
    // Open modal
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    await user.click(addButton);
    
    const maxFileSizeOption = await screen.findByText('Max File Size');
    await user.click(maxFileSizeOption);
    
    // Check unit dropdown options
    await waitFor(() => {
      const unitSelect = screen.getByLabelText('Size unit') as HTMLSelectElement;
      const options = Array.from(unitSelect.options).map(opt => opt.value);
      
      expect(options).toEqual(['KB', 'MB', 'GB']);
      expect(options).not.toContain('B');
    });
  });
});
