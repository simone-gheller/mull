import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@vextis/ui';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultMode="dark">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
