import { useTheme, FONTS, Btn, Badge } from '@mull/ui';

function Section({ title, description, children, T, danger }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${danger ? T.redBorder : T.border}`,
      borderRadius: '6px', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${danger ? T.redBorder : T.border}`,
        background: danger ? T.redBg : T.overlay,
      }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '14px', color: danger ? T.red : T.textPrimary, marginBottom: description ? '2px' : 0 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>{description}</div>
        )}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function SecurityRow({ label, value, action, statusVariant, T }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: T.overlay,
      border: `1px solid ${T.border}`, borderRadius: '4px',
    }}>
      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>{value}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {statusVariant && <Badge T={T} variant={statusVariant}>enabled</Badge>}
        {action && <Btn T={T} variant="secondary" size="sm" disabled>{action}</Btn>}
      </div>
    </div>
  );
}

const PLACEHOLDER_SESSIONS = [
  { id: 1, device: 'Chrome on macOS', location: 'Milan, Italy', lastSeen: 'now' },
  { id: 2, device: 'Safari on iPhone', location: 'Milan, Italy', lastSeen: '3h ago' },
];

export default function SecurityPage() {
  const { T } = useTheme();

  return (
    <div>
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // settings · security
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Security
      </h1>

      <Section T={T} title="Password" description="Manage your account password">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SecurityRow T={T} label="Password" value="Never changed" action="change" />
        </div>
      </Section>

      <Section T={T} title="Two-factor authentication" description="Add a second layer of protection to your account">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SecurityRow T={T} label="Authenticator app" value="Not configured" action="enable" />
        </div>
      </Section>

      <Section T={T} title="Active sessions" description="Devices currently signed in to your account">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLACEHOLDER_SESSIONS.map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: T.overlay,
                border: `1px solid ${T.border}`, borderRadius: '4px',
              }}
            >
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>{s.device}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
                  {s.location} · {s.lastSeen}
                </div>
              </div>
              <Btn T={T} variant="secondary" size="sm" disabled>revoke</Btn>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" disabled>revoke all other sessions</Btn>
          </div>
        </div>
      </Section>

      <Section T={T} title="Danger Zone" description="Irreversible actions on your account" danger>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>Delete account</div>
            <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>Permanently removes your user and leaves all orgs</div>
          </div>
          <Btn T={T} variant="danger" size="sm" disabled>delete account</Btn>
        </div>
      </Section>
    </div>
  );
}
