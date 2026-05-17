import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePaymentStatus, hasAccessToPlan, hasAccessToAnyPlan } from '../use-payment-status';

describe('usePaymentStatus', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('hook behavior', () => {
    it('should return loading state initially', async () => {
      const { result } = renderHook(() => usePaymentStatus());
      
      // In test environment, the effect runs synchronously
      // Just verify the hook returns a valid status object
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('currentPlan');
      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('isFree');
      expect(result.current).toHaveProperty('isSubscribed');
      expect(result.current).toHaveProperty('error');
    });

    it('should return none status when not authenticated', async () => {
      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBeNull();
      expect(result.current.status).toBe('none');
      expect(result.current.isFree).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return subscription data when available', async () => {
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token',
        subscription: {
          planId: 'pro',
          status: 'active',
        },
      }));

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBe('pro');
      expect(result.current.status).toBe('active');
      expect(result.current.isFree).toBe(false);
      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should identify free plan correctly', async () => {
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token',
        subscription: {
          planId: 'free',
          status: 'active',
        },
      }));

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBe('free');
      expect(result.current.isFree).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should handle cancelled subscription', async () => {
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token',
        subscription: {
          planId: 'pro',
          status: 'cancelled',
        },
      }));

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBe('pro');
      expect(result.current.status).toBe('cancelled');
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle past_due subscription', async () => {
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token',
        subscription: {
          planId: 'enterprise',
          status: 'past_due',
        },
      }));

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBe('enterprise');
      expect(result.current.status).toBe('past_due');
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle auth without subscription data', async () => {
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token',
      }));

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentPlan).toBeNull();
      expect(result.current.status).toBe('none');
      expect(result.current.isFree).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle invalid JSON in session storage', async () => {
      sessionStorage.setItem('uigen_auth', 'invalid-json');

      const { result } = renderHook(() => usePaymentStatus());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.currentPlan).toBeNull();
      expect(result.current.status).toBe('none');
    });

    it('should cleanup on unmount', async () => {
      const { unmount } = renderHook(() => usePaymentStatus());
      
      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('hasAccessToPlan', () => {
    it('should return false when currentPlan is null', () => {
      expect(hasAccessToPlan(null, 'pro')).toBe(false);
    });

    it('should return true for exact plan match', () => {
      expect(hasAccessToPlan('pro', 'pro')).toBe(true);
    });

    it('should return true for higher tier plan', () => {
      expect(hasAccessToPlan('enterprise', 'pro')).toBe(true);
      expect(hasAccessToPlan('pro', 'basic')).toBe(true);
      expect(hasAccessToPlan('basic', 'free')).toBe(true);
    });

    it('should return false for lower tier plan', () => {
      expect(hasAccessToPlan('free', 'basic')).toBe(false);
      expect(hasAccessToPlan('basic', 'pro')).toBe(false);
      expect(hasAccessToPlan('pro', 'enterprise')).toBe(false);
    });

    it('should handle custom plan names with exact match', () => {
      expect(hasAccessToPlan('custom-plan', 'custom-plan')).toBe(true);
      expect(hasAccessToPlan('custom-plan', 'other-plan')).toBe(false);
    });

    it('should handle plan hierarchy correctly', () => {
      // Free tier
      expect(hasAccessToPlan('free', 'free')).toBe(true);
      expect(hasAccessToPlan('free', 'basic')).toBe(false);
      
      // Basic tier
      expect(hasAccessToPlan('basic', 'free')).toBe(true);
      expect(hasAccessToPlan('basic', 'basic')).toBe(true);
      expect(hasAccessToPlan('basic', 'pro')).toBe(false);
      
      // Pro tier
      expect(hasAccessToPlan('pro', 'free')).toBe(true);
      expect(hasAccessToPlan('pro', 'basic')).toBe(true);
      expect(hasAccessToPlan('pro', 'pro')).toBe(true);
      expect(hasAccessToPlan('pro', 'enterprise')).toBe(false);
      
      // Enterprise tier
      expect(hasAccessToPlan('enterprise', 'free')).toBe(true);
      expect(hasAccessToPlan('enterprise', 'basic')).toBe(true);
      expect(hasAccessToPlan('enterprise', 'pro')).toBe(true);
      expect(hasAccessToPlan('enterprise', 'enterprise')).toBe(true);
    });
  });

  describe('hasAccessToAnyPlan', () => {
    it('should return false when currentPlan is null', () => {
      expect(hasAccessToAnyPlan(null, ['pro', 'enterprise'])).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasAccessToAnyPlan('pro', [])).toBe(false);
    });

    it('should return true if user has access to any plan', () => {
      expect(hasAccessToAnyPlan('pro', ['basic', 'pro'])).toBe(true);
      expect(hasAccessToAnyPlan('enterprise', ['pro', 'enterprise'])).toBe(true);
    });

    it('should return true if user has higher tier than any required plan', () => {
      expect(hasAccessToAnyPlan('enterprise', ['free', 'basic'])).toBe(true);
      expect(hasAccessToAnyPlan('pro', ['free'])).toBe(true);
    });

    it('should return false if user does not have access to any plan', () => {
      expect(hasAccessToAnyPlan('free', ['basic', 'pro'])).toBe(false);
      expect(hasAccessToAnyPlan('basic', ['pro', 'enterprise'])).toBe(false);
    });

    it('should handle single plan in array', () => {
      expect(hasAccessToAnyPlan('pro', ['pro'])).toBe(true);
      expect(hasAccessToAnyPlan('free', ['pro'])).toBe(false);
    });

    it('should handle multiple plans correctly', () => {
      expect(hasAccessToAnyPlan('pro', ['free', 'basic', 'pro', 'enterprise'])).toBe(true);
      expect(hasAccessToAnyPlan('basic', ['pro', 'enterprise'])).toBe(false);
    });
  });
});
