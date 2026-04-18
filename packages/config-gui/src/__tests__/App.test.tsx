import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App.js';
import { AppProvider } from '../contexts/AppContext.js';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn()
  };
});

describe('App', () => {
  it('should render the main layout with header', () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Check header is rendered
    expect(screen.getByText('UIGen Config GUI')).toBeDefined();
  });
  
  it('should render footer', () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Check footer is rendered
    expect(screen.getByText(/UIGen Config GUI - Manage annotation configurations visually/)).toBeDefined();
  });
  
  it('should render annotation configuration section', () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Check main content area is rendered
    expect(screen.getByText('Annotation Configuration')).toBeDefined();
  });
});
