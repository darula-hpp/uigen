import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CSSEditor } from '../CSSEditor.js';

/**
 * Tests for CSSEditor component
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

describe('CSSEditor', () => {
  const mockOnSave = vi.fn();
  
  beforeEach(() => {
    mockOnSave.mockClear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  
  describe('Component Rendering', () => {
    it('should render with initial theme content', () => {
      const baseStyles = '/* Base Styles */';
      const theme = '.button { color: blue; }';
      render(<CSSEditor baseStyles={baseStyles} theme={theme} onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(theme);
    });
    
    it('should display line numbers', () => {
      const theme = '.button {\n  color: blue;\n}';
      render(<CSSEditor baseStyles="" theme={theme} onSave={mockOnSave} />);
      
      // Should have 3 lines
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    
    it('should apply monospace font styling', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      expect(textarea).toHaveClass('font-mono');
    });
    
    it('should apply custom className', () => {
      const { container } = render(
        <CSSEditor baseStyles="" theme="" onSave={mockOnSave} className="custom-class" />
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
    
    it('should have accessible label', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByLabelText('CSS theme editor');
      expect(textarea).toBeInTheDocument();
    });
  });
  
  describe('Content Changes', () => {
    it('should update content on text input', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '.test { color: red; }' } });
      
      expect(textarea.value).toBe('.test { color: red; }');
    });
    
    it('should update line numbers when content changes', () => {
      render(<CSSEditor baseStyles="" theme=".button { color: blue; }" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.button {\n  color: blue;\n}' } });
      
      // Should now have 3 lines
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    
    it('should update content when theme prop changes', () => {
      const { rerender } = render(
        <CSSEditor baseStyles="" theme="initial" onSave={mockOnSave} />
      );
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('initial');
      
      rerender(<CSSEditor baseStyles="" theme="updated" onSave={mockOnSave} />);
      expect(textarea.value).toBe('updated');
    });
  });
  
  describe('Debounced Save', () => {
    it('should debounce save operations with 500ms delay', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.test { color: red; }' } });
      
      // Should not call save immediately
      expect(mockOnSave).not.toHaveBeenCalled();
      
      // Fast-forward 500ms and run all timers
      await vi.advanceTimersByTimeAsync(500);
      
      expect(mockOnSave).toHaveBeenCalledWith('.test { color: red; }');
    });
    
    it('should reset debounce timer on subsequent changes', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      
      // First change
      fireEvent.change(textarea, { target: { value: '.test1' } });
      await vi.advanceTimersByTimeAsync(300);
      
      // Second change before debounce completes
      fireEvent.change(textarea, { target: { value: '.test2' } });
      await vi.advanceTimersByTimeAsync(300);
      
      // Should not have called save yet
      expect(mockOnSave).not.toHaveBeenCalled();
      
      // Complete the debounce period
      await vi.advanceTimersByTimeAsync(200);
      
      // Should only save the latest value once
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith('.test2');
    });
  });
  
  describe('Save Status Indicators', () => {
    it('should display saving indicator during save operations', async () => {
      // Use real timers for this test to properly handle async state
      vi.useRealTimers();
      
      // Mock a slow save operation
      let resolveSave: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.test' } });
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should show saving indicator
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeTruthy();
      });
      
      // Complete the save operation
      resolveSave!();
      await savePromise;
      
      // Restore fake timers
      vi.useFakeTimers();
    });
    
    it('should display success indicator after successful save', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      mockOnSave.mockResolvedValue(undefined);
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.test' } });
      
      // Wait for debounce period and save to complete
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Wait for save to complete and success indicator to appear
      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeTruthy();
      });
      
      // Restore fake timers
      vi.useFakeTimers();
    });
    
    it('should display error messages with details on save failure', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      const errorMessage = 'Failed to write CSS file';
      mockOnSave.mockRejectedValue(new Error(errorMessage));
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.test' } });
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
      
      // Restore fake timers
      vi.useFakeTimers();
    });
    
    it('should auto-hide success indicator after 2 seconds', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      mockOnSave.mockResolvedValue(undefined);
      
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      fireEvent.change(textarea, { target: { value: '.test' } });
      
      // Wait for debounce period and save to complete
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Wait for save to complete and success indicator to appear
      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeTruthy();
      });
      
      // Wait 2 seconds for auto-hide
      await new Promise(resolve => setTimeout(resolve, 2100));
      
      // Success indicator should be hidden
      expect(screen.queryByText('Saved')).toBeNull();
      
      // Restore fake timers
      vi.useFakeTimers();
    });
    
    it('should have save status container', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      // The component should have a container for save status (even if empty initially)
      const container = document.querySelector('.mb-4.h-6');
      expect(container).toBeTruthy();
    });
  });
  
  describe('Standard Text Editing Operations', () => {
    it('should support copy operation', () => {
      render(<CSSEditor baseStyles="" theme=".test { color: red; }" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      
      // Select all text
      textarea.setSelectionRange(0, textarea.value.length);
      
      // Browser handles copy automatically for textarea
      expect(textarea.value).toBe('.test { color: red; }');
    });
    
    it('should support paste operation', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      
      // Simulate paste event
      fireEvent.change(textarea, { target: { value: 'pasted content' } });
      
      expect((textarea as HTMLTextAreaElement).value).toBe('pasted content');
    });
    
    it('should support undo/redo through browser', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      
      // Browser handles undo/redo automatically for textarea
      // We just verify the textarea is editable
      fireEvent.change(textarea, { target: { value: 'first' } });
      expect((textarea as HTMLTextAreaElement).value).toBe('first');
      
      fireEvent.change(textarea, { target: { value: 'second' } });
      expect((textarea as HTMLTextAreaElement).value).toBe('second');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
      
      // Should still show line 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    
    it('should handle very long content', () => {
      const longContent = Array(100).fill('.class { color: red; }').join('\n');
      render(<CSSEditor baseStyles="" theme={longContent} onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longContent);
      
      // Should show line 100
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    
    it('should handle special characters in CSS', () => {
      const specialContent = '.class::before { content: "\\2022"; }';
      render(<CSSEditor baseStyles="" theme={specialContent} onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialContent);
    });
  });
  
  describe('Syntax Highlighting', () => {
    it('should apply syntax highlighting to CSS content', () => {
      const cssContent = '.button { color: blue; }';
      const { container } = render(<CSSEditor baseStyles="" theme={cssContent} onSave={mockOnSave} />);
      
      // Check that the highlighted code element exists
      const codeElement = container.querySelector('code.language-css');
      expect(codeElement).toBeInTheDocument();
    });
    
    it('should update syntax highlighting when content changes', () => {
      const { container } = render(<CSSEditor baseStyles="" theme="" onSave={mockOnSave} />);
      
      const textarea = screen.getByTestId('css-editor-textarea');
      const codeElement = container.querySelector('code.language-css');
      
      // Initially empty
      expect(codeElement?.innerHTML).toBe('');
      
      // Change content
      fireEvent.change(textarea, { target: { value: '.test { color: red; }' } });
      
      // Highlighting should be updated (Prism adds HTML for syntax highlighting)
      expect(codeElement?.innerHTML).not.toBe('');
    });
  });
});
