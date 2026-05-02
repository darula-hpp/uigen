import { useLayoutEffect } from 'react';

/**
 * Hook to initialize theme on component mount.
 * Uses useLayoutEffect to prevent FOUC (Flash of Unstyled Content).
 * 
 * This hook reads the stored theme preference from localStorage and applies
 * the appropriate class to the document root before the browser paints.
 */
export function useThemeInitializer() {
  useLayoutEffect(() => {
    const stored = localStorage.getItem('theme');
    const root = document.documentElement;
    
    if (stored === 'dark') {
      root.classList.add('dark');
    } else if (stored === 'light') {
      root.classList.remove('dark');
    } else {
      // No stored preference - use system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);
}
