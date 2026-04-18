import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, debounceWithImmediate } from '../debounce.js';

/**
 * Unit tests for debounce utility
 * 
 * Requirements: 23.3
 */

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn('test');

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(500);

    // Should be called after delay
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous call when invoked again', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn('first');
    vi.advanceTimersByTime(200);

    debouncedFn('second');
    vi.advanceTimersByTime(200);

    debouncedFn('third');
    vi.advanceTimersByTime(500);

    // Should only call with the last value
    expect(mockFn).toHaveBeenCalledWith('third');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should batch multiple rapid calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    // Rapid calls
    debouncedFn('call1');
    debouncedFn('call2');
    debouncedFn('call3');
    debouncedFn('call4');
    debouncedFn('call5');

    // Should not be called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(500);

    // Should only call once with last value
    expect(mockFn).toHaveBeenCalledWith('call5');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should use default delay of 500ms', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn);

    debouncedFn('test');

    vi.advanceTimersByTime(499);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should handle custom delay', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('test');

    vi.advanceTimersByTime(999);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should handle multiple arguments', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn('arg1', 'arg2', 'arg3');

    vi.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should preserve function context', () => {
    const mockFn = vi.fn();
    const obj = {
      value: 42,
      method: function(this: any) {
        mockFn(this.value);
      }
    };

    const debouncedMethod = debounce(obj.method.bind(obj), 500);
    debouncedMethod();

    vi.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith(42);
  });
});

describe('debounceWithImmediate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should execute immediately when immediate=true', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceWithImmediate(mockFn, 500, true);

    debouncedFn('test');

    // Should be called immediately
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not execute immediately when immediate=false', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceWithImmediate(mockFn, 500, false);

    debouncedFn('test');

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    // Should be called after delay
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should execute immediately only on first call', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceWithImmediate(mockFn, 500, true);

    debouncedFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    debouncedFn('second');
    expect(mockFn).toHaveBeenCalledTimes(1); // Still 1, not called again

    vi.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(1); // Still 1, immediate mode doesn't call after delay
  });

  it('should reset after delay expires', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceWithImmediate(mockFn, 500, true);

    debouncedFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);

    debouncedFn('second');
    expect(mockFn).toHaveBeenCalledTimes(2); // Called immediately again
  });
});
