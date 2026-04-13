import { useEffect, useState } from 'react';
import { Button } from './ui/button';

type Theme = 'light' | 'dark';

/**
 * ThemeToggle component
 * Implements Requirements 30.1-30.5
 * 
 * Provides a toggle button to switch between dark and light themes.
 * Persists user preference in local storage and respects system preference as default.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Requirement 30.4: Apply stored theme preference on load
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      return stored;
    }
    
    // Requirement 30.5: Use system preference as default when no preference is stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Requirement 30.6: Apply theme to all components consistently using CSS variables
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Requirement 30.3: Persist theme preference in local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Requirement 30.2: Switch between dark and light themes when user clicks toggle
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </Button>
  );
}
