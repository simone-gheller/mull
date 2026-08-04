import { FONTS } from '@vextis/ui';

export function SearchButton({ T, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search docs"
      className="docs-search-button"
      style={{
        height: '34px',
        minWidth: '260px',
        borderRadius: '6px',
        border: `1px solid ${T.border}`,
        background: T.bg,
        color: T.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '0 9px 0 12px',
        fontFamily: FONTS.mono,
        fontSize: '11px',
        cursor: 'pointer',
      }}
    >
      <span>Search docs...</span>
      <span style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 5px', color: T.textDisabled }}>
        cmd+k
      </span>
    </button>
  );
}
