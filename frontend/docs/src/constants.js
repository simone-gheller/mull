export const APP_URL = import.meta.env.VITE_APP_URL
  || (import.meta.env.DEV ? 'http://localhost:5173' : 'https://app.vextis.io');
export const LANDING_URL = import.meta.env.VITE_LANDING_URL
  || (import.meta.env.DEV ? 'http://localhost:5174' : 'https://vextis.io');

// No default (dev or prod) — unlike APP_URL/LANDING_URL, this stays unset until an OpenStatus
// page actually exists (see status/README.md). Consumers must treat a falsy STATUS_URL as
// "hide the link", not "use a fallback".
export const STATUS_URL = import.meta.env.VITE_STATUS_URL || null;
