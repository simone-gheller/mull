import { FONTS, scrollFadeCss } from '@vextis/ui';

// Layout/responsive CSS that can't be expressed as inline styles (pseudo-selectors, media
// queries) — kept as a single injected stylesheet, consistent with @vextis/ui's no-CSS-file
// convention for everything else.
export function GlobalStyles({ T }) {
  return (
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      ${scrollFadeCss(T)}
      ::selection { background: ${T.termGreenBg}; color: ${T.textPrimary}; }
      .docs-top-nav { position: sticky; top: 0; z-index: 100; height: 56px; }
      /* Full-bleed like the sidebar below it — no max-width/margin:auto, or the brand logo would
         float centered while the sidebar sits flush left. */
      .docs-nav-inner { height: 56px; padding: 0 24px; display: flex; align-items: center; gap: 22px; }
      .docs-brand { display: flex; align-items: center; gap: 9px; min-width: 140px; }
      .docs-search-wrap { flex: 1; display: flex; justify-content: center; }
      .docs-top-links, .docs-actions { display: flex; align-items: center; gap: 6px; }
      .docs-top-links a { font-family: ${FONTS.mono}; font-size: 11px; color: ${T.textMuted}; text-decoration: none; padding: 6px 8px; }
      /* Full-bleed, sidebar flush against the left edge — same shape as ApiReferencePage's own
         layout, on purpose: no max-width/margin:auto wrapper that would center the whole block
         with dead space on either side on wide viewports. */
      .docs-shell { display: flex; align-items: stretch; }
      .docs-sidebar { width: 280px; flex-shrink: 0; position: sticky; top: 56px; align-self: start; padding: 24px 16px 24px 24px; max-height: calc(100vh - 56px); display: flex; flex-direction: column; }
      .docs-sidebar-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-right: 6px; }
      .docs-content-area { flex: 1; min-width: 0; display: flex; gap: 44px; max-width: 900px; padding: 38px 40px 88px; align-items: start; }
      .docs-shell.has-toc .docs-content-area { max-width: 1080px; }
      .docs-page { flex: 1; min-width: 0; max-width: 680px; }
      .docs-toc { width: 180px; flex-shrink: 0; position: sticky; top: 76px; align-self: start; display: none; }
      .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .doc-card { min-width: 0; }
      .doc-card:hover, .search-result:hover { border-color: ${T.borderHover} !important; background: ${T.overlay} !important; }
      .docs-sidebar-link:hover, .docs-top-links a:hover { color: ${T.textPrimary} !important; }
      .command-block { max-width: 100%; }
      .docs-mobile-layer, .docs-modal-layer { position: fixed; inset: 0; z-index: 220; }
      .docs-mobile-backdrop, .docs-modal-backdrop { position: absolute; inset: 0; border: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.58); }
      .docs-mobile-panel { position: relative; width: min(340px, 86vw); min-height: 100vh; overflow: auto; }
      .docs-mobile-panel .docs-sidebar { display: block; position: static; width: 100%; border-right: 0 !important; padding: 0; max-height: none; }
      .docs-mobile-panel .docs-sidebar-scroll { overflow: visible; }
      .docs-search-dialog { position: relative; width: min(620px, calc(100vw - 32px)); margin: 86px auto 0; border-radius: 8px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
      summary::marker { color: ${T.termGreen}; }
      @media (min-width: 1180px) {
        .docs-toc { display: block; }
      }
      /* One breakpoint for "switch to the hamburger menu" — top-links, the desktop sidebar, and
         the menu button all flip together here, so there's never a width where the section
         switcher (Docs/API/Changelog) is reachable neither in the bar nor via the menu button. */
      @media (max-width: 900px) {
        .docs-actions, .docs-top-links { display: none; }
        .docs-menu-button { display: inline-flex !important; }
        .docs-search-button { min-width: 220px !important; }
        .docs-shell > .docs-sidebar { display: none; }
        .docs-content-area { display: block; max-width: none; padding: 32px 28px 70px; }
        .api-sidebar { display: none !important; }
      }
      @media (max-width: 760px) {
        .docs-nav-inner { padding: 0 18px; gap: 12px; }
        .docs-brand { min-width: auto; }
        .docs-brand span:last-child { display: none; }
        .docs-search-wrap { justify-content: stretch; }
        .docs-search-button { min-width: 0 !important; width: 100%; }
        .docs-search-button span:last-child { display: none; }
        .docs-content-area { padding: 26px 18px 70px; }
        .card-grid { grid-template-columns: 1fr; }
        .step-row, .docs-table-row { grid-template-columns: 1fr !important; }
        h1 { font-size: 32px !important; }
        pre { max-width: 100%; overflow-x: auto; }
      }
    `}</style>
  );
}
