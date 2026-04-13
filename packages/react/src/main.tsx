import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// @ts-ignore - config is injected by CLI
const config = window.__UIGEN_CONFIG__;

if (!config) {
  throw new Error('UIGen config not found. Make sure the CLI injected the config.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>
);
