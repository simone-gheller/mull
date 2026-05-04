import { useState, useEffect } from 'react';
import { useTheme, FONTS, Btn, Badge, Input } from '@mull/ui';
import { useProfile } from '../hooks/useProfile';
import { Avatar } from '../components/settings/Avatar';

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
        <Btn T={T} variant="secondary" size="sm" disabled>{action}</Btn>
      </div>
    </div>
  );
}

const ROLE_VARIANT = { OWNER: 'warning', ADMIN: 'info', USER: 'success' };

export default function ProfilePage() {
  const { T } = useTheme();
  const { profile, loading, error, update } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error'

  useEffect(() => {
    if (profile?.displayName != null) setDisplayName(profile.displayName);
  }, [profile?.displayName]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await update({ displayName });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const name = profile?.displayName || profile?.email?.split('@')[0] || '—';
  const role = profile?.role ?? 'USER';
  const roleLabel = role.toLowerCase();
  const roleVariant = ROLE_VARIANT[role] ?? 'default';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[64, 120, 160, 80].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: '6px', background: T.elevated, border: `1px solid ${T.border}` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.red }}>
        ✗ failed to load profile — <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: '12px', textDecoration: 'underline' }}>retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // settings · profile
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Your Profile
      </h1>

      {/* Hero strip */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px',
        padding: '24px', marginBottom: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '20px',
      }}>
        <Avatar name={name} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '18px', color: T.textPrimary }}>{name}</span>
            <Badge T={T} variant={roleVariant}>{roleLabel}</Badge>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
            {profile?.email}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <Section T={T} title="Personal Information" description="Your display name visible to teammates">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <Input
            T={T}
            label="Display Name"
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <Input
            T={T}
            label="Email"
            value={profile?.email ?? ''}
            readOnly
            hint="Email is managed by your auth provider"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {saveStatus === 'saved' && (
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.termGreen }}>✓ saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>✗ failed to save</span>
          )}
          <Btn T={T} variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'saving…' : 'save changes'}
          </Btn>
        </div>
      </Section>

      {/* Security */}
      <Section T={T} title="Security" description="Password and two-factor authentication">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SecurityRow T={T} label="Password" value="Managed via Supabase Auth" action="change" />
          <SecurityRow T={T} label="Two-factor authentication" value="Not configured" action="enable" />
          <SecurityRow T={T} label="Active sessions" value="Managed via Supabase Auth" action="view all" />
        </div>
      </Section>

      {/* Personal tokens */}
      <Section T={T} title="Personal API Tokens" description="Tokens scoped to your user — not shared with the org">
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          // personal tokens — coming soon
        </div>
      </Section>

      {/* Danger zone */}
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
