/**
 * UseHooks Mode Example: Analytics & Side Effects
 *
 * Use useHooks mode when you need side effects alongside the
 * built-in view — analytics tracking, document title updates,
 * subscriptions, keyboard shortcuts, etc.
 *
 * The built-in view renders normally; your hook runs alongside it.
 */

import { useEffect, useRef } from 'react';
import { overrideRegistry } from '../index';

// Example 1: Analytics tracking
overrideRegistry.register({
  targetId: 'users.list',
  useHooks: ({ resource }) => {
    useEffect(() => {
      // Track page view when the list view mounts
      console.log('[Analytics] Page view:', {
        page: `${resource.uigenId}.list`,
        resource: resource.name,
        timestamp: Date.now(),
      });

      return () => {
        // Track time spent on page when unmounting
        console.log('[Analytics] Page exit:', resource.uigenId);
      };
    }, [resource.uigenId]);
  },
});

// Example 2: Document title update
overrideRegistry.register({
  targetId: 'users.detail',
  useHooks: ({ resource }) => {
    const previousTitle = useRef(document.title);

    useEffect(() => {
      document.title = `${resource.name} Details — My App`;

      return () => {
        document.title = previousTitle.current;
      };
    }, [resource.name]);
  },
});

// Example 3: Keyboard shortcut registration
overrideRegistry.register({
  targetId: 'users.create',
  useHooks: () => {
    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        // Ctrl/Cmd + S to submit the form
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          const submitButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
          submitButton?.click();
        }
      }

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
  },
});

// Example 4: Return data for child components via useOverrideData
overrideRegistry.register({
  targetId: 'users.search',
  useHooks: ({ resource }) => {
    // Return value is stored in OverrideDataContext
    // Child components can access it via useOverrideData()
    return {
      resourceName: resource.name,
      searchStartedAt: Date.now(),
    };
  },
});
