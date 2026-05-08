import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FONTS } from '@mull/ui';

export default function TrashButton({ onClick, label = 'delete', T }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: T.elevated, border: `1px solid ${T.border}`, borderRadius: '4px',
          padding: '3px 8px', fontFamily: FONTS.mono, fontSize: '10px', color: T.textSecondary,
          whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
        }}>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${T.border}`,
          }} />
        </div>
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        style={{
          background: hovered ? `${T.red}15` : 'transparent',
          border: `1px solid ${hovered ? `${T.red}40` : T.border}`,
          borderRadius: '4px', cursor: 'pointer',
          padding: '4px', display: 'flex', alignItems: 'center',
          transition: 'all 0.12s',
        }}
      >
        <Trash2 size={13} color={hovered ? T.red : T.textMuted} strokeWidth={1.5} />
      </button>
    </div>
  );
}
