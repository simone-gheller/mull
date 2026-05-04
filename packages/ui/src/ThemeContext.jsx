import { createContext, useState } from 'react';
import { THEMES } from './tokens.js';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children, defaultMode = 'dark' }) {
  const [mode, setMode] = useState(defaultMode);
  const T = THEMES[mode];
  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ T, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
