import { useState, useEffect } from 'react';
import { useTheme, FONTS, Btn, Badge, Input } from '@mull/ui';
import { useOrg } from '../hooks/useOrg';
import { useMembers } from '../hooks/useMembers';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/settings/Avatar';

// ── Shared primitives ────────────────────────────────────────

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

function UsageBar({ label, used, total, unit, T }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color = pct > 85 ? T.red : pct > 65 ? T.amber : T.termGreen;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          {used} / {total} {unit}
        </span>
      </div>
      <div style={{ height: '4px', background: T.elevated, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: '2px', transition: 'width 0.6s ease',
          boxShadow: `0 0 6px ${color}40`,
        }} />
      </div>
    </div>
  );
}

function Skeleton({ height = 40, T }) {
  return <div style={{ height, borderRadius: '6px', background: T.elevated, border: `1px solid ${T.border}`, marginBottom: '8px' }} />;
}

const ROLE_VARIANT = { OWNER: 'warning', ADMIN: 'info', USER: 'default', VIEWER: 'default' };
const TABS = ['members', 'tokens', 'billing', 'audit', 'settings'];

// ── Members tab ──────────────────────────────────────────────

function MemberRow({ member, isYou, T }) {
  const [hover, setHover] = useState(false);
  const role = member.role.toLowerCase();
  const variant = ROLE_VARIANT[member.role] ?? 'default';
  const name = member.displayName || member.email.split('@')[0];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto auto',
        gap: '16px', alignItems: 'center',
        padding: '10px 0', borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Avatar name={name} size={32} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>{name}</span>
            {isYou && (
              <span style={{
                fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted,
                border: `1px solid ${T.border}`, padding: '1px 5px', borderRadius: '2px',
              }}>you</span>
            )}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>{member.email}</div>
        </div>
      </div>

      <div />

      <Badge T={T} variant={variant}>{role}</Badge>

      <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
        {hover && !isYou && member.role !== 'OWNER' && (
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.red, padding: '3px 6px',
          }}>
            remove
          </button>
        )}
      </div>
    </div>
  );
}

function InviteBar({ T }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');

  return (
    <div style={{
      display: 'flex', gap: '10px',
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: '6px', padding: '16px', marginBottom: '20px',
    }}>
      <div style={{ flex: 1 }}>
        <Input
          T={T}
          placeholder="colleague@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
            padding: '8px 12px', fontFamily: FONTS.mono, fontSize: '12px',
            color: T.textSecondary, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="USER">member</option>
          <option value="ADMIN">admin</option>
        </select>
        <Btn T={T} variant="primary" size="md" disabled>send invite</Btn>
      </div>
    </div>
  );
}

function MembersTab({ org, members, membersLoading, membersError, currentUserId, T }) {
  if (membersLoading) {
    return <><Skeleton height={56} T={T} /><Skeleton height={200} T={T} /></>;
  }
  if (membersError) {
    return (
      <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.red }}>
        ✗ failed to load members
      </div>
    );
  }

  return (
    <div>
      <InviteBar T={T} />

      <UsageBar T={T} label="seats" used={members.length} total={25} unit="members" />

      <Section T={T} title="Active Members">
        {members.map(m => (
          <MemberRow key={m.id} member={m} isYou={m.id === currentUserId} T={T} />
        ))}
      </Section>

      <Section T={T} title="Pending Invites" description="Invite system coming soon">
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          // invitations — coming soon
        </div>
      </Section>
    </div>
  );
}

// ── Tokens tab ───────────────────────────────────────────────

function TokenRow({ name, prefix, scope, lastUsed, created, T }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        gap: '16px', alignItems: 'center',
        padding: '10px 0', borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>{name}</span>
          <code style={{
            fontFamily: FONTS.mono, fontSize: '11px', color: T.amber,
            background: T.amberBg, border: `1px solid ${T.amberBorder}`,
            padding: '1px 6px', borderRadius: '3px',
          }}>{prefix}…</code>
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
          created {created} · last used {lastUsed}
        </div>
      </div>
      <Badge T={T} variant="info">{scope}</Badge>
      {hover
        ? <Btn T={T} variant="danger" size="sm">revoke</Btn>
        : <div style={{ width: '60px' }} />}
    </div>
  );
}

function TokensTab({ T }) {
  return (
    <Section T={T} title="Organization API Tokens" description="Shared tokens scoped to this org — visible to admins">
      <TokenRow T={T} name="github-actions-prod" prefix="mull_sk_7pR3" scope="read:secrets" lastUsed="10m ago" created="3mo ago" />
      <TokenRow T={T} name="vercel-deploy" prefix="mull_sk_2qN8" scope="read:secrets" lastUsed="1h ago" created="2mo ago" />
      <div style={{ marginTop: '16px' }}>
        <Btn T={T} variant="terminal" size="sm" icon="+">new org token</Btn>
      </div>
    </Section>
  );
}

// ── Billing tab ──────────────────────────────────────────────

function BillingTab({ memberCount, T }) {
  const invoices = [
    { date: 'May 1, 2026', amount: '$0.00', status: 'paid' },
    { date: 'Apr 1, 2026', amount: '$0.00', status: 'paid' },
    { date: 'Mar 1, 2026', amount: '$0.00', status: 'paid' },
  ];

  return (
    <div>
      <div style={{
        background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
        borderRadius: '6px', padding: '20px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.12em', marginBottom: '6px' }}>
            CURRENT PLAN
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '28px', color: T.textPrimary }}>$0</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>/month</span>
            <span style={{
              fontFamily: FONTS.mono, fontSize: '11px', letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: '3px', textTransform: 'uppercase',
              background: T.elevated, color: T.textMuted, border: `1px solid ${T.border}`,
            }}>Hobby</span>
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, marginTop: '4px' }}>
            Free tier — no billing card required
          </div>
        </div>
        <Btn T={T} variant="warning" size="sm" disabled>upgrade plan</Btn>
      </div>

      <Section T={T} title="Usage This Period">
        <UsageBar T={T} label="members" used={memberCount} total={3} unit="members" />
        <UsageBar T={T} label="api calls" used={0} total={10000} unit="calls/mo" />
      </Section>

      <Section T={T} title="Invoice History">
        {invoices.map(inv => (
          <div key={inv.date} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0', borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary }}>{inv.date}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>{inv.amount}</span>
              <Badge T={T} variant="success">{inv.status}</Badge>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ── Audit tab ────────────────────────────────────────────────

function AuditTab({ T }) {
  return (
    <Section T={T} title="Audit Log" description="Last 30 days of activity">
      <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
        // audit log — coming soon
      </div>
    </Section>
  );
}

// ── Settings tab ─────────────────────────────────────────────

function SettingsTab({ org, onUpdateOrg, T }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (org?.name != null) setName(org.name);
  }, [org?.name]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await onUpdateOrg({ name });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const ssoRows = [
    { label: 'Google Workspace SSO', value: 'Not configured', active: false },
    { label: 'GitHub Org SSO', value: 'Not configured', active: false },
    { label: 'SAML SSO', value: 'Available on Growth plan', active: false, locked: true },
  ];

  return (
    <div>
      <Section T={T} title="Organization Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <Input
            T={T}
            label="Org Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Input
            T={T}
            label="Org ID"
            value={org?.id ?? ''}
            readOnly
            hint="Read-only identifier"
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

      <Section T={T} title="SSO Auto-provisioning" description="Let users with a verified domain auto-join this org on first login">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ssoRows.map(row => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: T.overlay,
              border: `1px solid ${T.border}`, borderRadius: '4px',
            }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: row.locked ? T.textMuted : T.textPrimary, marginBottom: '2px' }}>
                  {row.label}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>{row.value}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {row.locked
                  ? <Badge T={T}>upgrade</Badge>
                  : <Btn T={T} variant="secondary" size="sm" disabled>configure</Btn>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section T={T} title="Danger Zone" description="Irreversible actions for this organization" danger>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>Transfer ownership</div>
              <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>Transfer this org to another member</div>
            </div>
            <Btn T={T} variant="warning" size="sm" disabled>transfer</Btn>
          </div>
          <div style={{ height: '1px', background: T.redBorder }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>Delete organization</div>
              <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>Permanently deletes all apps, parameters, and members</div>
            </div>
            <Btn T={T} variant="danger" size="sm" disabled>delete org</Btn>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function OrgSettingsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const { org, loading: orgLoading, error: orgError, update: updateOrg } = useOrg();
  const { members, loading: membersLoading, error: membersError } = useMembers();
  const [tab, setTab] = useState('members');

  const orgName = org?.name ?? user?.organization?.name ?? 'organization';

  if (orgLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton height={40} T={T} />
        <Skeleton height={48} T={T} />
        <Skeleton height={200} T={T} />
      </div>
    );
  }

  if (orgError) {
    return (
      <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.red }}>
        ✗ failed to load organization
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
        // settings · organization
      </div>

      {/* Org header */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px',
        padding: '20px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0,
          background: T.elevated, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONTS.mono, fontSize: '20px', color: T.textPrimary,
        }}>▣</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '18px', color: T.textPrimary, marginBottom: '4px' }}>
            {orgName}
          </h1>
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
            {org?.memberCount ?? members.length} {(org?.memberCount ?? members.length) === 1 ? 'member' : 'members'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', paddingLeft: '8px',
        background: T.surface, border: `1px solid ${T.border}`,
        borderBottom: 'none', borderRadius: '6px 6px 0 0',
        marginBottom: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: FONTS.mono, fontSize: '11px', letterSpacing: '0.04em',
              color: tab === t ? T.textPrimary : T.textMuted,
              padding: '12px 16px',
              borderBottom: `2px solid ${tab === t ? T.textPrimary : 'transparent'}`,
              transition: 'all 0.12s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderTop: 'none', borderRadius: '0 0 6px 6px',
        padding: '24px',
      }}>
        {tab === 'members' && (
          <MembersTab
            T={T}
            org={org}
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            currentUserId={user?.id}
          />
        )}
        {tab === 'tokens'  && <TokensTab T={T} />}
        {tab === 'billing' && <BillingTab T={T} memberCount={org?.memberCount ?? members.length} />}
        {tab === 'audit'   && <AuditTab T={T} />}
        {tab === 'settings' && <SettingsTab T={T} org={org} onUpdateOrg={updateOrg} />}
      </div>
    </div>
  );
}
