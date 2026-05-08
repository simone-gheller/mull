import { useTheme, FONTS } from '@mull/ui';

export default function ComingSoon({ section, feature, icon = '◈', title, description }) {
  const { T } = useTheme();
  return (
    <div>
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // {section} · {feature}
      </div>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '48px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px',
      }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '24px', color: T.textMuted }}>{icon}</span>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '16px', color: T.textPrimary }}>{title}</div>
        {description && (
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, maxWidth: '320px' }}>{description}</div>
        )}
      </div>
    </div>
  );
}
