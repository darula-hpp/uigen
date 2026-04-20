'use client';

import { ThemeProvider } from 'next-themes';
import { PHProvider } from './posthog-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </PHProvider>
  );
}
