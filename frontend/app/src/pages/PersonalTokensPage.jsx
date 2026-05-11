import { useTheme, FONTS } from '@mull/ui';
import AccessKeysPanel from '../components/settings/AccessKeysPanel';

function Section({ title, description, children, T }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: T.overlay }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '14px', color: T.textPrimary, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>{description}</div>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

export default function PersonalTokensPage() {
  const { T } = useTheme();
  return (
    <div>
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // settings · tokens
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, marginBottom: '24px' }}>
        Personal Tokens
      </h1>
      <Section T={T} title="Personal API Tokens" description="Tokens scoped to your user for CLI, SDK, and REST API access">
        <AccessKeysPanel T={T} mode="personal" />
      </Section>
    </div>
  );
}
