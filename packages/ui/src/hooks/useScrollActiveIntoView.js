import { useEffect, useRef } from 'react';

// Scrolls the element marked `data-nav-active="true"` inside the returned container
// into view whenever `dep` changes (e.g. route pathname) — keeps a highlighted nav
// item visible even when it sits below the fold of a long, independently-scrolling menu.
export function useScrollActiveIntoView(dep) {
  const containerRef = useRef(null);

  useEffect(() => {
    const active = containerRef.current?.querySelector('[data-nav-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [dep]);

  return containerRef;
}
