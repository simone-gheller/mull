export const APP_URL = import.meta.env.VITE_APP_URL
  || (import.meta.env.DEV ? 'http://localhost:5173' : 'https://app.vextis.io');
export const LANDING_URL = import.meta.env.VITE_LANDING_URL
  || (import.meta.env.DEV ? 'http://localhost:5174' : 'https://vextis.io');
