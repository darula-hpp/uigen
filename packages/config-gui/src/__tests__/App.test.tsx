import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.js';
import { AppProvider } from '../contexts/AppContext.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

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
  beforeEach(() => {
    mockFetch.mockClear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
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
  
  it('should render Theme tab in navigation', () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Check Theme tab is present
    const cssTab = screen.getByTestId('css-tab');
    expect(cssTab).toBeDefined();
    expect(cssTab.textContent).toBe('Theme');
  });
  
  it('should load CSS content when CSS tab is clicked', async () => {
    const mockBaseStyles = '/* Base Styles */\nbody { margin: 0; }';
    const mockTheme = '/* Custom Theme */\n.custom { color: red; }';
    
    // Mock all API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/css') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ baseStyles: mockBaseStyles, theme: mockTheme })
        });
      }
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {}
          })
        });
      }
      if (url === '/api/spec/structure') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ paths: [] })
        });
      }
      if (url === '/api/annotations') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      // Mock other API calls to prevent errors
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Click CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    // Wait for CSS API to be called
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const cssCall = calls.find(call => call[0] === '/api/css');
      expect(cssCall).toBeDefined();
    });
  });
  
  it('should display loading indicator while fetching CSS', async () => {
    // Mock API response with delay
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ baseStyles: '/* Base */', theme: '/* Theme */' })
      }), 100))
    );
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Click CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    // Check loading indicator appears
    expect(screen.getByText('Loading CSS content...')).toBeDefined();
  });
  
  it('should pass save handler to CSSEditor and call POST /api/css', async () => {
    const mockBaseStyles = '/* Base Styles */';
    const mockTheme = '/* Test Theme */\n.custom { color: red; }';
    
    // Mock GET request for loading CSS
    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/css' && (!options || options.method === 'GET' || !options.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ baseStyles: mockBaseStyles, theme: mockTheme })
        });
      }
      // Mock POST request for saving CSS
      if (url === '/api/css' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Click CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    // Wait for CSS content to load
    await waitFor(() => {
      expect(screen.getByTestId('css-editor-textarea')).toBeDefined();
    });
    
    // Get the textarea and modify content
    const textarea = screen.getByTestId('css-editor-textarea') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, '/* Updated Theme */');
    
    // Wait for debounced save to trigger (500ms + buffer)
    await waitFor(() => {
      const postCalls = mockFetch.mock.calls.filter(
        call => call[0] === '/api/css' && call[1]?.method === 'POST'
      );
      expect(postCalls.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
    
    // Verify POST was called with correct data
    const postCall = mockFetch.mock.calls.find(
      call => call[0] === '/api/css' && call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(postCall![1].headers).toEqual({ 'Content-Type': 'application/json' });
  });
  
  it('should maintain tab state when switching between tabs', async () => {
    const mockBaseStyles = '/* Base Styles */';
    const mockTheme = '/* Test Theme */';
    
    // Mock all API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/css') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ baseStyles: mockBaseStyles, theme: mockTheme })
        });
      }
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {}
          })
        });
      }
      if (url === '/api/spec/structure') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ paths: [] })
        });
      }
      if (url === '/api/annotations') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('annotations-tab')).toBeDefined();
    });
    
    // Start on annotations tab
    expect(screen.getByTestId('annotations-tab').getAttribute('aria-current')).toBe('page');
    
    // Switch to CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    await waitFor(() => {
      expect(cssTab.getAttribute('aria-current')).toBe('page');
    });
    
    // Switch to annotations tab
    const annotationsTab = screen.getByTestId('annotations-tab');
    await user.click(annotationsTab);
    
    await waitFor(() => {
      expect(annotationsTab.getAttribute('aria-current')).toBe('page');
    });
    
    // Switch back to CSS tab - should maintain state
    await user.click(cssTab);
    
    await waitFor(() => {
      expect(cssTab.getAttribute('aria-current')).toBe('page');
      // CSS content should still be loaded (not re-fetching)
      expect(screen.getByTestId('css-editor-textarea')).toBeDefined();
    });
  });
  
  it('should display error message when CSS loading fails', async () => {
    const errorMessage = 'Failed to read CSS file';
    
    // Mock all API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/css') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: errorMessage })
        });
      }
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {}
          })
        });
      }
      if (url === '/api/spec/structure') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ paths: [] })
        });
      }
      if (url === '/api/annotations') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Click CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load CSS content')).toBeDefined();
      // Use getAllByText since error appears in both global banner and CSS tab
      const errorElements = screen.getAllByText(errorMessage);
      expect(errorElements.length).toBeGreaterThan(0);
    });
    
    // Verify retry button is present
    expect(screen.getByText('Try again')).toBeDefined();
  });
  
  it('should retry loading CSS when retry button is clicked', async () => {
    const errorMessage = 'Failed to read CSS file';
    const mockBaseStyles = '/* Base Styles */';
    const mockTheme = '/* Test Theme */';
    let callCount = 0;
    
    // Mock all API responses - first call fails, second succeeds
    mockFetch.mockImplementation((url) => {
      if (url === '/api/css') {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: errorMessage })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ baseStyles: mockBaseStyles, theme: mockTheme })
        });
      }
      if (url === '/api/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {}
          })
        });
      }
      if (url === '/api/spec/structure') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ paths: [] })
        });
      }
      if (url === '/api/annotations') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
    
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    
    // Click CSS tab
    const cssTab = screen.getByTestId('css-tab');
    await user.click(cssTab);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load CSS content')).toBeDefined();
    });
    
    // Click retry button
    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);
    
    // Wait for CSS editor to appear (successful load)
    await waitFor(() => {
      expect(screen.getByTestId('css-editor-textarea')).toBeDefined();
    });
  });
});
