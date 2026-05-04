import { useTheme, FONTS } from '@mull/ui';

export function Avatar({ name = '?', size = 36, sub }) {
  const { T, mode } = useTheme();
  const safe = name || '?';
  const initials = safe.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = safe.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const isDark = mode === 'dark';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: '6px', flexShrink: 0,
        background: `hsl(${hue}, 20%, ${isDark ? '18%' : '88%'})`,
        border: `1px solid hsl(${hue}, 30%, ${isDark ? '25%' : '75%'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONTS.mono, fontSize: size * 0.34 + 'px',
        color: `hsl(${hue}, 60%, ${isDark ? '70%' : '35%'})`,
        letterSpacing: '0.05em',
      }}>
        {initials}
      </div>
      {sub && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </div>
        </div>
      )}
    </div>
  );
}
