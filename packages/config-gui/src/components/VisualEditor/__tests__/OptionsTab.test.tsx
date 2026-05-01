import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptionsTab } from '../OptionsTab.js';

describe('OptionsTab', () => {
  it('renders JSONEditor with correct props', () => {
    const mockOnChange = vi.fn();
    const testJson = '{"title": "Test Chart"}';
    
    render(
      <OptionsTab
        optionsJson={testJson}
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    // Check that the JSON editor textarea is rendered with the value
    const textarea = screen.getByRole('textbox', { name: /Chart Options/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(testJson);
  });
  
  it('displays info message about optional configuration', () => {
    const mockOnChange = vi.fn();
    
    render(
      <OptionsTab
        optionsJson=""
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    expect(screen.getByText(/Configure advanced chart options using JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/This is optional/i)).toBeInTheDocument();
  });
  
  it('displays common options reference', () => {
    const mockOnChange = vi.fn();
    
    render(
      <OptionsTab
        optionsJson=""
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    expect(screen.getByText(/Common Options:/i)).toBeInTheDocument();
    expect(screen.getByText(/Chart title text/i)).toBeInTheDocument();
    expect(screen.getByText(/Legend configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Tooltip settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Enable responsive sizing/i)).toBeInTheDocument();
  });
  
  it('passes error to JSONEditor', () => {
    const mockOnChange = vi.fn();
    const testError = 'Invalid JSON syntax';
    
    render(
      <OptionsTab
        optionsJson='{"invalid": }'
        onOptionsChange={mockOnChange}
        error={testError}
      />
    );
    
    // Check that error is displayed
    expect(screen.getByText(/Invalid JSON:/i)).toBeInTheDocument();
    expect(screen.getByText(testError)).toBeInTheDocument();
  });
  
  it('calls onOptionsChange when JSON changes', () => {
    const mockOnChange = vi.fn();
    
    render(
      <OptionsTab
        optionsJson=""
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    const textarea = screen.getByRole('textbox', { name: /Chart Options/i });
    const newJson = '{"title": "New Chart"}';
    
    // Simulate user typing
    textarea.focus();
    textarea.setSelectionRange(0, 0);
    
    // Use fireEvent to change the value
    const { fireEvent } = require('@testing-library/react');
    fireEvent.change(textarea, { target: { value: newJson } });
    
    expect(mockOnChange).toHaveBeenCalledWith(newJson);
  });
  
  it('renders with empty optionsJson', () => {
    const mockOnChange = vi.fn();
    
    render(
      <OptionsTab
        optionsJson=""
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    const textarea = screen.getByRole('textbox', { name: /Chart Options/i });
    expect(textarea).toHaveValue('');
  });
  
  it('renders with valid JSON optionsJson', () => {
    const mockOnChange = vi.fn();
    const validJson = JSON.stringify({
      title: 'Sales Chart',
      legend: { show: true, position: 'bottom' },
      responsive: true
    }, null, 2);
    
    render(
      <OptionsTab
        optionsJson={validJson}
        onOptionsChange={mockOnChange}
        error=""
      />
    );
    
    const textarea = screen.getByRole('textbox', { name: /Chart Options/i });
    expect(textarea).toHaveValue(validJson);
  });
});
