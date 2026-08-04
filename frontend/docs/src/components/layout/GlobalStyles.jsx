import { FONTS } from '@vextis/ui';

// Layout/responsive CSS that can't be expressed as inline styles (pseudo-selectors, media
// queries) — kept as a single injected stylesheet, consistent with @vextis/ui's no-CSS-file
// convention for everything else.
export function GlobalStyles({ T }) {
  return (
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      ::selection { background: ${T.termGreenBg}; color: ${T.textPrimary}; }
      .docs-top-nav { position: sticky; top: 0; z-index: 100; height: 56px; }
      .docs-nav-inner { max-width: 1160px; margin: 0 auto; height: 56px; padding: 0 32px; display: flex; align-items: center; gap: 22px; }
      .docs-brand { display: flex; align-items: center; gap: 9px; min-width: 140px; }
      .docs-search-wrap { flex: 1; display: flex; justify-content: center; }
      .docs-top-links, .docs-actions { display: flex; align-items: center; gap: 6px; }
      .docs-top-links a { font-family: ${FONTS.mono}; font-size: 11px; color: ${T.textMuted}; text-decoration: none; padding: 6px 8px; }
      .docs-shell { max-width: 1160px; margin: 0 auto; padding: 38px 32px 88px; display: grid; grid-template-columns: 244px minmax(0, 720px); gap: 44px; align-items: start; }
      .docs-shell.has-toc { grid-template-columns: 244px minmax(0, 620px) 180px; }
      .docs-sidebar { position: sticky; top: 78px; align-self: start; padding-right: 20px; }
      .docs-toc { position: sticky; top: 78px; align-self: start; display: none; }
      .docs-page { min-width: 0; }
      .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .doc-card { min-width: 0; }
      .doc-card:hover, .search-result:hover { border-color: ${T.borderHover} !important; background: ${T.overlay} !important; }
      .docs-sidebar-link:hover, .docs-top-links a:hover { color: ${T.textPrimary} !important; }
      .command-block { max-width: 100%; }
      .docs-mobile-layer, .docs-modal-layer { position: fixed; inset: 0; z-index: 220; }
      .docs-mobile-backdrop, .docs-modal-backdrop { position: absolute; inset: 0; border: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.58); }
      .docs-mobile-panel { position: relative; width: min(340px, 86vw); min-height: 100vh; overflow: auto; }
      .docs-mobile-panel .docs-sidebar { display: block; position: static; border-right: 0 !important; padding-right: 0; }
      .docs-search-dialog { position: relative; width: min(620px, calc(100vw - 32px)); margin: 86px auto 0; border-radius: 8px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
      summary::marker { color: ${T.termGreen}; }
      @media (min-width: 1180px) {
        .docs-toc { display: block; }
      }
      @media (max-width: 900px) {
        .docs-shell, .docs-shell.has-toc { grid-template-columns: 220px minmax(0, 1fr); gap: 28px; }
        .docs-actions, .docs-top-links { display: none; }
        .docs-search-button { min-width: 220px !important; }
      }
      @media (max-width: 760px) {
        .docs-nav-inner { padding: 0 18px; gap: 12px; }
        .docs-brand { min-width: auto; }
        .docs-brand span:last-child { display: none; }
        .docs-search-wrap { justify-content: stretch; }
        .docs-search-button { min-width: 0 !important; width: 100%; }
        .docs-search-button span:last-child { display: none; }
        .docs-menu-button { display: inline-flex !important; }
        .docs-shell, .docs-shell.has-toc { display: block; padding: 26px 18px 70px; }
        .docs-shell > .docs-sidebar { display: none; }
        .card-grid { grid-template-columns: 1fr; }
        .step-row, .docs-table-row { grid-template-columns: 1fr !important; }
        h1 { font-size: 32px !important; }
        pre { max-width: 100%; overflow-x: auto; }
      }
    `}</style>
  );
}
