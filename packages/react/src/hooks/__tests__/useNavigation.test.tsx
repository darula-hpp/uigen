import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigation, routes } from '../useNavigation';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/users', search: '', hash: '', state: null }),
    useParams: () => ({ id: '123' }),
  };
});

describe('useNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  /**
   * Test navigation methods
   * Validates Requirements 32.3, 32.4
   */
  describe('Navigation Methods', () => {
    it('should navigate to list view', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToList('users');
      expect(mockNavigate).toHaveBeenCalledWith('/users');
    });

    it('should navigate to detail view', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToDetail('users', '123');
      expect(mockNavigate).toHaveBeenCalledWith('/users/123');
    });

    it('should navigate to create view', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToCreate('users');
      expect(mockNavigate).toHaveBeenCalledWith('/users/new');
    });

    it('should navigate to edit view', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToEdit('users', '123');
      expect(mockNavigate).toHaveBeenCalledWith('/users/123/edit');
    });

    it('should navigate to search view', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToSearch('users');
      expect(mockNavigate).toHaveBeenCalledWith('/users/search');
    });

    it('should navigate to home', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goToHome();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to custom path', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.navigateTo('/custom/path');
      expect(mockNavigate).toHaveBeenCalledWith('/custom/path');
    });
  });

  /**
   * Test browser history navigation
   * Validates Requirement 32.5
   */
  describe('Browser History Navigation', () => {
    it('should navigate back', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goBack();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should navigate forward', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      result.current.goForward();
      expect(mockNavigate).toHaveBeenCalledWith(1);
    });
  });

  /**
   * Test location and params access
   */
  describe('Location and Params', () => {
    it('should provide current location', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      expect(result.current.location).toBeDefined();
      expect(result.current.location.pathname).toBe('/users');
    });

    it('should provide current params', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: BrowserRouter,
      });

      expect(result.current.params).toBeDefined();
      expect(result.current.params.id).toBe('123');
    });
  });
});

describe('routes helper', () => {
  /**
   * Test route path builders
   * Validates Requirements 32.2, 32.4
   */
  it('should build list route path', () => {
    expect(routes.list('users')).toBe('/users');
  });

  it('should build detail route path', () => {
    expect(routes.detail('users', '123')).toBe('/users/123');
  });

  it('should build create route path', () => {
    expect(routes.create('users')).toBe('/users/new');
  });

  it('should build edit route path', () => {
    expect(routes.edit('users', '123')).toBe('/users/123/edit');
  });

  it('should build search route path', () => {
    expect(routes.search('users')).toBe('/users/search');
  });

  it('should build home route path', () => {
    expect(routes.home()).toBe('/');
  });
});
