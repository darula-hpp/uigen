import { createContext, useContext, type ReactNode } from 'react';
import type { UIGenApp } from '@uigen-dev/core';

interface AppContextValue {
  config: UIGenApp;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  config: UIGenApp;
  children: ReactNode;
}

export function AppProvider({ config, children }: AppProviderProps) {
  return (
    <AppContext.Provider value={{ config }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useOptionalApp() {
  return useContext(AppContext);
}
