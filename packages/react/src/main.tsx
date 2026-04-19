import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// @ts-ignore - config is injected by CLI
const config = window.__UIGEN_CONFIG__;

if (!config) {
  throw new Error('UIGen config not found. Make sure the CLI injected the config.');
}

// Apply custom CSS if injected by CLI
// Custom CSS extends the default styles (Tailwind + theme variables)
const customCSS = window.__UIGEN_CSS__;
if (customCSS) {
  try {
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);
  } catch (error) {
    console.warn('Failed to apply custom CSS:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>
);
