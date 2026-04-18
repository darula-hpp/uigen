import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { AppProvider } from './contexts/AppContext.js';
import './index.css';

/**
 * Entry point for the Config GUI application
 * 
 * Sets up:
 * - React root
 * - Global state provider (AppProvider)
 * - App component
 * 
 * Requirements: 1.5
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
