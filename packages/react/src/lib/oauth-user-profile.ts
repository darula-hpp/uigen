/**
 * OAuth User Profile Management Utilities
 * 
 * Provides functions for storing and retrieving OAuth user profile data
 * in browser localStorage. Used by OAuthStrategy for profile management.
 * 
 * Requirements: 15.5, 15.6, 15.7, 15.8
 */

const USER_PROFILE_KEY = 'oauth_user_profile';

/**
 * User profile information from OAuth provider
 */
export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
}

/**
 * Store OAuth user profile in localStorage
 * 
 * @param profile - User profile data from OAuth provider
 */
export function storeUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Retrieve OAuth user profile from localStorage
 * 
 * @returns User profile or null if not stored
 */
export function getUserProfile(): UserProfile | null {
  const profileJson = localStorage.getItem(USER_PROFILE_KEY);
  if (!profileJson) {
    return null;
  }

  try {
    const profile = JSON.parse(profileJson);
    // Validate profile structure
    if (profile && typeof profile === 'object' && 'email' in profile && 'name' in profile) {
      return profile as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('[OAuth] Failed to parse user profile:', error);
    return null;
  }
}

/**
 * Clear OAuth user profile from localStorage
 */
export function clearUserProfile(): void {
  localStorage.removeItem(USER_PROFILE_KEY);
}
