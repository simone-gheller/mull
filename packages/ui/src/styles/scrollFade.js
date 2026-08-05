// CSS for a scroll container whose scrollbar stays invisible at rest and fades in on
// hover/focus — pass into a consuming app's own injected <style> block (this package
// doesn't ship CSS files; see CLAUDE.md). Apply the `ui-scroll-fade` class to the
// scrollable element itself.
export function scrollFadeCss(T) {
  return `
    .ui-scroll-fade {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      transition: scrollbar-color 0.15s;
    }
    .ui-scroll-fade:hover, .ui-scroll-fade:focus-within {
      scrollbar-color: ${T.border} transparent;
    }
    .ui-scroll-fade::-webkit-scrollbar { width: 8px; }
    .ui-scroll-fade::-webkit-scrollbar-track { background: transparent; }
    .ui-scroll-fade::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 8px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    .ui-scroll-fade:hover::-webkit-scrollbar-thumb,
    .ui-scroll-fade:focus-within::-webkit-scrollbar-thumb {
      background: ${T.border};
      background-clip: padding-box;
    }
  `;
}
