import { FONTS } from '@vextis/ui';

// Like content/Table.jsx but for parameter/property rows — needs a required flag and a type
// column that Table's fixed two-column layout doesn't have room for.
export function SchemaTable({ T, rows }) {
  if (!rows.length) return null;

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {rows.map((row, index) => (
        <div key={row.name} style={{
          display: 'grid',
          gridTemplateColumns: '160px 140px minmax(0, 1fr)',
          gap: '12px',
          padding: '10px 14px',
          background: T.surface,
          borderBottom: index === rows.length - 1 ? 'none' : `1px solid ${T.border}`,
          alignItems: 'start',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <code style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen, wordBreak: 'break-word' }}>{row.name}</code>
            {row.required && (
              <span style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.red }}>required</span>
            )}
          </span>
          <code style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>{row.type}</code>
          <span style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.55 }}>
            {row.description}
          </span>
        </div>
      ))}
    </div>
  );
}
