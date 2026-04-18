/**
 * Integration tests for SearchFilterToolbar component
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilterToolbar } from '../SearchFilterToolbar.js';

describe('SearchFilterToolbar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    filterOption: 'all' as const,
    onFilterChange: vi.fn(),
    onExportSummary: vi.fn()
  };

  it('should render search input', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search elements by name, path, or state...');
  });

  it('should render filter button with current filter label', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const filterButton = screen.getByTestId('filter-button');
    expect(filterButton).toBeInTheDocument();
    expect(filterButton).toHaveTextContent('Show All');
  });

  it('should render export button', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const exportButton = screen.getByTestId('export-button');
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toHaveTextContent('Export Summary');
  });

  it('should call onSearchChange when typing in search input', () => {
    const onSearchChange = vi.fn();
    render(<SearchFilterToolbar {...defaultProps} onSearchChange={onSearchChange} />);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'email' } });
    
    expect(onSearchChange).toHaveBeenCalledWith('email');
  });

  it('should display clear button when search query is not empty', () => {
    render(<SearchFilterToolbar {...defaultProps} searchQuery="email" />);
    
    const clearButton = screen.getByTestId('clear-search');
    expect(clearButton).toBeInTheDocument();
  });

  it('should not display clear button when search query is empty', () => {
    render(<SearchFilterToolbar {...defaultProps} searchQuery="" />);
    
    const clearButton = screen.queryByTestId('clear-search');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should call onSearchChange with empty string when clear button is clicked', () => {
    const onSearchChange = vi.fn();
    render(<SearchFilterToolbar {...defaultProps} searchQuery="email" onSearchChange={onSearchChange} />);
    
    const clearButton = screen.getByTestId('clear-search');
    fireEvent.click(clearButton);
    
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should open filter dropdown when filter button is clicked', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    // Check that all filter options are visible
    expect(screen.getByTestId('filter-option-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-option-ignored')).toBeInTheDocument();
    expect(screen.getByTestId('filter-option-active')).toBeInTheDocument();
    expect(screen.getByTestId('filter-option-overrides')).toBeInTheDocument();
  });

  it('should call onFilterChange when a filter option is selected', () => {
    const onFilterChange = vi.fn();
    render(<SearchFilterToolbar {...defaultProps} onFilterChange={onFilterChange} />);
    
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    const ignoredOption = screen.getByTestId('filter-option-ignored');
    fireEvent.click(ignoredOption);
    
    expect(onFilterChange).toHaveBeenCalledWith('ignored');
  });

  it('should close filter dropdown after selecting an option', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    const ignoredOption = screen.getByTestId('filter-option-ignored');
    fireEvent.click(ignoredOption);
    
    // Dropdown should be closed
    expect(screen.queryByTestId('filter-option-all')).not.toBeInTheDocument();
  });

  it('should highlight the currently selected filter option', () => {
    render(<SearchFilterToolbar {...defaultProps} filterOption="ignored" />);
    
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    const ignoredOption = screen.getByTestId('filter-option-ignored');
    expect(ignoredOption).toHaveClass('bg-blue-50');
  });

  it('should call onExportSummary when export button is clicked', () => {
    const onExportSummary = vi.fn();
    render(<SearchFilterToolbar {...defaultProps} onExportSummary={onExportSummary} />);
    
    const exportButton = screen.getByTestId('export-button');
    fireEvent.click(exportButton);
    
    expect(onExportSummary).toHaveBeenCalled();
  });

  it('should display correct filter label for each filter option', () => {
    const { rerender } = render(<SearchFilterToolbar {...defaultProps} filterOption="all" />);
    expect(screen.getByTestId('filter-button')).toHaveTextContent('Show All');
    
    rerender(<SearchFilterToolbar {...defaultProps} filterOption="ignored" />);
    expect(screen.getByTestId('filter-button')).toHaveTextContent('Show Ignored Only');
    
    rerender(<SearchFilterToolbar {...defaultProps} filterOption="active" />);
    expect(screen.getByTestId('filter-button')).toHaveTextContent('Show Active Only');
    
    rerender(<SearchFilterToolbar {...defaultProps} filterOption="overrides" />);
    expect(screen.getByTestId('filter-button')).toHaveTextContent('Show Overrides Only');
  });

  it('should close filter dropdown when clicking outside', () => {
    render(<SearchFilterToolbar {...defaultProps} />);
    
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    // Dropdown should be open
    expect(screen.getByTestId('filter-option-all')).toBeInTheDocument();
    
    // Click on backdrop
    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    
    // Dropdown should be closed
    expect(screen.queryByTestId('filter-option-all')).not.toBeInTheDocument();
  });
});
