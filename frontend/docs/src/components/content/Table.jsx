import { FONTS } from '@vextis/ui';

export function Table({ T, rows, firstColumnWidth = '190px' }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {rows.map(([left, right], index) => (
        <div key={`${left}-${index}`} className="docs-table-row" style={{
          display: 'grid',
          gridTemplateColumns: `${firstColumnWidth} minmax(0, 1fr)`,
          gap: '16px',
          padding: '12px 14px',
          background: T.surface,
          borderBottom: index === rows.length - 1 ? 'none' : `1px solid ${T.border}`,
        }}>
          <code style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>{left}</code>
          <span style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.55 }}>{right}</span>
        </div>
      ))}
    </div>
  );
}
