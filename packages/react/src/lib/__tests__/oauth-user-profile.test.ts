/**
 * Unit tests for OAuth user profile management utilities
 * 
 * Requirements: 15.1-15.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storeUserProfile, getUserProfile, clearUserProfile, type UserProfile } from '../oauth-user-profile';

describe('OAuth User Profile Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('storeUserProfile', () => {
    it('should store user profile in localStorage', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      storeUserProfile(profile);

      const stored = localStorage.getItem('oauth_user_profile');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(profile);
    });

    it('should store profile without picture field', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      storeUserProfile(profile);

      const stored = localStorage.getItem('oauth_user_profile');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(profile);
    });

    it('should overwrite existing profile', () => {
      const profile1: UserProfile = {
        email: 'user1@example.com',
        name: 'User One'
      };

      const profile2: UserProfile = {
        email: 'user2@example.com',
        name: 'User Two'
      };

      storeUserProfile(profile1);
      storeUserProfile(profile2);

      const stored = localStorage.getItem('oauth_user_profile');
      expect(JSON.parse(stored!)).toEqual(profile2);
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve stored user profile', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      localStorage.setItem('oauth_user_profile', JSON.stringify(profile));

      const retrieved = getUserProfile();
      expect(retrieved).toEqual(profile);
    });

    it('should return null when no profile is stored', () => {
      const retrieved = getUserProfile();
      expect(retrieved).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('oauth_user_profile', 'invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const retrieved = getUserProfile();
      
      expect(retrieved).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OAuth] Failed to parse user profile:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return null for profile missing required fields', () => {
      // Profile missing 'name' field
      localStorage.setItem('oauth_user_profile', JSON.stringify({ email: 'user@example.com' }));

      const retrieved = getUserProfile();
      expect(retrieved).toBeNull();
    });

    it('should return null for non-object profile', () => {
      localStorage.setItem('oauth_user_profile', JSON.stringify('not an object'));

      const retrieved = getUserProfile();
      expect(retrieved).toBeNull();
    });

    it('should handle profile with extra fields', () => {
      const profile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        extraField: 'extra value'
      };

      localStorage.setItem('oauth_user_profile', JSON.stringify(profile));

      const retrieved = getUserProfile();
      expect(retrieved).toEqual(profile);
    });
  });

  describe('clearUserProfile', () => {
    it('should remove user profile from localStorage', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User'
      };

      localStorage.setItem('oauth_user_profile', JSON.stringify(profile));
      expect(localStorage.getItem('oauth_user_profile')).toBeTruthy();

      clearUserProfile();
      expect(localStorage.getItem('oauth_user_profile')).toBeNull();
    });

    it('should not throw when no profile is stored', () => {
      expect(() => clearUserProfile()).not.toThrow();
    });
  });

  describe('Round-trip storage', () => {
    it('should preserve profile data through store and retrieve', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      storeUserProfile(profile);
      const retrieved = getUserProfile();

      expect(retrieved).toEqual(profile);
    });

    it('should handle multiple store and retrieve cycles', () => {
      const profiles: UserProfile[] = [
        { email: 'user1@example.com', name: 'User One' },
        { email: 'user2@example.com', name: 'User Two', picture: 'https://example.com/2.jpg' },
        { email: 'user3@example.com', name: 'User Three' }
      ];

      profiles.forEach(profile => {
        storeUserProfile(profile);
        const retrieved = getUserProfile();
        expect(retrieved).toEqual(profile);
      });
    });
  });
});
