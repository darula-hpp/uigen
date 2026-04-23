import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlState } from '../useUrlState.js';

describe('useUrlState', () => {
  beforeEach(() => {
    // Reset URL before each test
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000/');
    window.history.pushState = vi.fn();
  });

  it('should return default value when no URL parameter exists', () => {
    const { result } = renderHook(() => useUrlState('tab', 'annotations'));
    
    expect(result.current[0]).toBe('annotations');
  });

  it('should return URL parameter value when it exists', () => {
    (window as any).location = new URL('http://localhost:3000/?tab=visual');
    
    const { result } = renderHook(() => useUrlState('tab', 'annotations'));
    
    expect(result.current[0]).toBe('visual');
  });

  it('should update state and URL when setValue is called', () => {
    const pushStateSpy = vi.fn();
    window.history.pushState = pushStateSpy;
    
    const { result } = renderHook(() => useUrlState('tab', 'annotations'));
    
    act(() => {
      result.current[1]('preview');
    });
    
    expect(result.current[0]).toBe('preview');
    expect(pushStateSpy).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('tab=preview')
    );
  });

  it('should validate against allowed values', () => {
    (window as any).location = new URL('http://localhost:3000/?tab=invalid');
    
    const validTabs = ['annotations', 'visual', 'preview'] as const;
    const { result } = renderHook(() => 
      useUrlState('tab', 'annotations', validTabs)
    );
    
    // Should fall back to default when invalid value is in URL
    expect(result.current[0]).toBe('annotations');
  });

  it('should accept valid values from validation list', () => {
    (window as any).location = new URL('http://localhost:3000/?tab=visual');
    
    const validTabs = ['annotations', 'visual', 'preview'] as const;
    const { result } = renderHook(() => 
      useUrlState('tab', 'annotations', validTabs)
    );
    
    expect(result.current[0]).toBe('visual');
  });

  it('should handle popstate events for browser back/forward', () => {
    const { result } = renderHook(() => useUrlState('tab', 'annotations'));
    
    // Change to visual
    act(() => {
      result.current[1]('visual');
    });
    
    expect(result.current[0]).toBe('visual');
    
    // Simulate browser back button
    (window as any).location = new URL('http://localhost:3000/?tab=annotations');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    
    expect(result.current[0]).toBe('annotations');
  });

  it('should preserve other URL parameters', () => {
    (window as any).location = new URL('http://localhost:3000/?foo=bar&tab=annotations');
    const pushStateSpy = vi.fn();
    window.history.pushState = pushStateSpy;
    
    const { result } = renderHook(() => useUrlState('tab', 'annotations'));
    
    act(() => {
      result.current[1]('visual');
    });
    
    const callArgs = pushStateSpy.mock.calls[0];
    expect(callArgs[2]).toContain('foo=bar');
    expect(callArgs[2]).toContain('tab=visual');
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useUrlState('tab', 'annotations'));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});
