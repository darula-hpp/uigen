/**
 * Server selection utilities for managing selected server in session storage
 * Implements Requirements 19.3, 19.4
 */

const SERVER_STORAGE_KEY = 'uigen_selected_server';

/**
 * Store selected server URL in session storage
 * Requirement 19.3: Store selected server in session storage
 */
export function storeSelectedServer(serverUrl: string): void {
  sessionStorage.setItem(SERVER_STORAGE_KEY, serverUrl);
}

/**
 * Retrieve selected server URL from session storage
 * Requirement 19.4: Route API requests to selected server
 */
export function getSelectedServer(): string | null {
  return sessionStorage.getItem(SERVER_STORAGE_KEY);
}

/**
 * Clear selected server from session storage
 */
export function clearSelectedServer(): void {
  sessionStorage.removeItem(SERVER_STORAGE_KEY);
}
