# @mull/app

Stack: React 19 + Vite + react-router-dom + Tailwind CSS
Design system: importa sempre da `@mull/ui`, mai duplicare componenti UI.
Tema: usa `useTheme()` per ottenere `{ T, mode, toggle }`.

## Struttura pagine
- /dashboard → panoramica secrets e stats
- /secrets → lista e gestione secrets
- /environments → gestione ambienti
- /tokens → access tokens API
- /audit → audit log
- /settings → impostazioni org

## Convenzioni
- Un file per pagina in `src/pages/`
- Componenti specifici dell'app in `src/components/` (non nel design system)
- Fetch dati con Supabase client in `src/lib/supabase.js`
