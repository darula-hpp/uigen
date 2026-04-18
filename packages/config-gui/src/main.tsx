import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { AppProvider } from './contexts/AppContext.js';
import { KeyboardNavigationProvider } from './contexts/KeyboardNavigationContext.js';
import './index.css';

/**
 * Entry point for the Config GUI application
 * 
 * Sets up:
 * - React root
 * - Global state provider (AppProvider)
 * - Keyboard navigation provider (KeyboardNavigationProvider)
 * - App component
 * 
 * Requirements: 1.5, 21.1, 21.2, 21.3, 21.4
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <KeyboardNavigationProvider>
        <App />
      </KeyboardNavigationProvider>
    </AppProvider>
  </React.StrictMode>
);
