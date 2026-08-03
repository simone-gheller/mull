import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@vextis/ui';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
