import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme, FONTS, Btn, Badge, Input } from '@mull/ui';
import { useOrg } from '../hooks/useOrg';
import { useMembers } from '../hooks/useMembers';
import { useInvites } from '../hooks/useInvites';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/settings/Avatar';
import AccessKeysPanel from '../components/settings/AccessKeysPanel';
import apiService from '../services/api';

function relativeExpiry(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'expired';
  if (days === 1) return 'expires tomorrow';
  return `expires in ${days}d`;
}

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

// ── Role select ──────────────────────────────────────────────

function RoleSelect({ value, onChange, T }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const options = [
    { value: 'USER', label: 'member' },
    { value: 'ADMIN', label: 'admin' },
  ];
  const selected = options.find(o => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', minWidth: '90px',
          background: T.surface, border: `1px solid ${open ? T.borderHover : T.border}`,
          borderRadius: '4px', padding: '8px 12px',
          fontFamily: FONTS.mono, fontSize: '12px', color: T.textSecondary,
          cursor: 'pointer', transition: 'border-color 0.1s',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{selected.label}</span>
        <ChevronDown size={12} color={T.textMuted} strokeWidth={1.5} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
          zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseEnter={() => setHov(opt.value)}
              onMouseLeave={() => setHov(null)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer',
                fontFamily: FONTS.mono, fontSize: '12px',
                color: opt.value === value ? T.textPrimary : T.textSecondary,
                background: hov === opt.value ? T.elevated : (opt.value === value ? T.overlay : 'transparent'),
                transition: 'background 0.1s',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

function InviteBar({ onSendInvite, T }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      const result = await onSendInvite({ email: email.trim(), role });
      setEmail('');
      setRole('USER');
      setFeedback({ type: 'success', msg: 'Invite sent' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      setFeedback({ type: 'error', msg: e.response?.data?.message || 'Failed to send invite' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex', gap: '10px',
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <Input
            T={T}
            placeholder="colleague@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <RoleSelect value={role} onChange={setRole} T={T} />
          <Btn T={T} variant="primary" size="md" onClick={handleSend} disabled={sending || !email.trim()}>
            {sending ? 'sending…' : 'send invite'}
          </Btn>
        </div>
      </div>
      {feedback && (
        <div style={{
          marginTop: '8px', fontFamily: FONTS.mono, fontSize: '11px',
          color: feedback.type === 'success' ? T.termGreen : T.red,
        }}>
          {feedback.type === 'success' ? '✓' : '✗'} {feedback.msg}
        </div>
      )}
    </div>
  );
}

function InviteRow({ invite, onCancel, T }) {
  const [hover, setHover] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [revokeError, setRevokeError] = useState(null);
  const roleVariant = ROLE_VARIANT[invite.role] ?? 'default';

  const handleCancel = async () => {
    setCancelling(true);
    setRevokeError(null);
    try {
      await onCancel(invite.id);
    } catch (e) {
      setRevokeError(e.response?.data?.message || 'Failed to revoke');
      setCancelling(false);
    }
  };

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
      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>{invite.email}</div>
        <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: revokeError ? T.red : T.textMuted }}>
          {revokeError ?? relativeExpiry(invite.expiresAt)}
        </div>
      </div>
      <div />
      <Badge T={T} variant={roleVariant}>{invite.role.toLowerCase()}</Badge>
      <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
        {(hover || cancelling) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              background: 'none', border: 'none', cursor: cancelling ? 'default' : 'pointer',
              fontFamily: FONTS.mono, fontSize: '11px', color: T.red, padding: '3px 6px',
            }}
          >
            {cancelling ? '…' : 'revoke'}
          </button>
        )}
      </div>
    </div>
  );
}

function MembersTab({ org, members, membersLoading, membersError, currentUserId, invites, invitesLoading, onSendInvite, onCancelInvite, T }) {
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
      <InviteBar onSendInvite={onSendInvite} T={T} />

      <UsageBar T={T} label="seats" used={members.length} total={25} unit="members" />

      <Section T={T} title="Active Members">
        {members.map(m => (
          <MemberRow key={m.id} member={m} isYou={m.id === currentUserId} T={T} />
        ))}
      </Section>

      <Section T={T} title="Pending Invites">
        {invitesLoading ? (
          <Skeleton height={40} T={T} />
        ) : invites.length === 0 ? (
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
            // no pending invites
          </div>
        ) : (
          invites.map(inv => (
            <InviteRow key={inv.id} invite={inv} onCancel={onCancelInvite} T={T} />
          ))
        )}
      </Section>
    </div>
  );
}

function TokensTab({ T }) {
  return (
    <Section T={T} title="Organization API Tokens" description="Shared tokens scoped to this org — visible to admins">
      <AccessKeysPanel T={T} mode="org" />
    </Section>
  );
}

// ── Billing tab ──────────────────────────────────────────────

function BillingTab({ memberCount, T }) {
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
        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          background: T.overlay,
          border: `1px solid ${T.border}`,
          borderRadius: '4px',
          fontFamily: FONTS.display,
          fontSize: '12px',
          color: T.textMuted,
        }}>
          API usage metrics coming soon.
        </div>
      </Section>
    </div>
  );
}

// ── Audit tab ────────────────────────────────────────────────

const AUDIT_ACTIONS = [
  '',
  'app.create',
  'app.update',
  'app.delete',
  'environment.create',
  'environment.delete',
  'parameter.create',
  'parameter_override.create',
  'parameter_value.update',
  'parameter_value.clear',
  'parameter_value.rollback',
  'parameter_value.reveal_current',
  'parameter_value.reveal_version',
  'config.fetch',
  'parameters.export',
  'invite.create',
  'invite.revoke',
  'invite.accept',
  'invite.preview',
  'org.create',
  'org.update',
  'profile.update',
];

function AuditTab({ T }) {
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ action: '', resourceType: '', outcome: '' });

  const loadEvents = async ({ append = false, cursor: next = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getAuditEvents({
        limit: 30,
        cursor: next,
        action: filters.action,
        resourceType: filters.resourceType,
        outcome: filters.outcome,
      });
      setEvents(prev => append ? [...prev, ...(result.items ?? [])] : (result.items ?? []));
      setCursor(next);
      setNextCursor(result.nextCursor ?? null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filters.action, filters.resourceType, filters.outcome]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const formatWhen = (value) => {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const outcomeVariant = {
    SUCCESS: 'default',
    DENIED: 'warning',
    FAILURE: 'danger',
  };

  return (
    <Section T={T} title="Audit Log" description="Tenant-visible security and configuration activity">
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr auto', gap: '10px', marginBottom: '14px' }}>
        <select
          value={filters.action}
          onChange={e => updateFilter('action', e.target.value)}
          style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
            color: T.textSecondary, fontFamily: FONTS.mono, fontSize: '11px', padding: '8px 10px',
          }}
        >
          {AUDIT_ACTIONS.map(action => (
            <option key={action || 'all'} value={action}>{action || 'all actions'}</option>
          ))}
        </select>
        <Input
          T={T}
          placeholder="resource type"
          value={filters.resourceType}
          onChange={e => updateFilter('resourceType', e.target.value)}
        />
        <select
          value={filters.outcome}
          onChange={e => updateFilter('outcome', e.target.value)}
          style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
            color: T.textSecondary, fontFamily: FONTS.mono, fontSize: '11px', padding: '8px 10px',
          }}
        >
          <option value="">all outcomes</option>
          <option value="SUCCESS">success</option>
          <option value="DENIED">denied</option>
          <option value="FAILURE">failure</option>
        </select>
        <Btn T={T} variant="secondary" size="sm" onClick={() => loadEvents()} disabled={loading}>
          refresh
        </Btn>
      </div>

      {error && (
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red, marginBottom: '10px' }}>
          ✗ {error}
        </div>
      )}

      <div style={{ border: `1px solid ${T.border}`, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '128px 1fr 1.2fr 1fr 90px',
          gap: '12px',
          padding: '9px 12px',
          background: T.overlay,
          borderBottom: `1px solid ${T.border}`,
          fontFamily: FONTS.mono,
          fontSize: '10px',
          color: T.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span>time</span><span>actor</span><span>action</span><span>target</span><span>outcome</span>
        </div>

        {loading && events.length === 0 ? (
          <div style={{ padding: '18px 12px' }}>
            <Skeleton height={34} T={T} />
            <Skeleton height={34} T={T} />
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '22px 12px', fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
            // no audit events match these filters
          </div>
        ) : events.map(event => (
          <div key={event.id} style={{
            display: 'grid',
            gridTemplateColumns: '128px 1fr 1.2fr 1fr 90px',
            gap: '12px',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>{formatWhen(event.createdAt)}</span>
            <span style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.actorDisplay || event.actorType.toLowerCase()}
            </span>
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textPrimary }}>{event.action}</span>
            <span style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.resourceLabel || event.resourceId || event.resourceType}
            </span>
            <Badge T={T} variant={outcomeVariant[event.outcome] ?? 'default'}>{event.outcome.toLowerCase()}</Badge>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
        <Btn T={T} variant="secondary" size="sm" onClick={() => loadEvents({ append: true, cursor: nextCursor })} disabled={loading || !nextCursor}>
          {loading && cursor ? 'loading…' : 'load more'}
        </Btn>
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
  const { toast } = useToast();
  const { org, loading: orgLoading, error: orgError, update: updateOrg } = useOrg();
  const { members, loading: membersLoading, error: membersError } = useMembers();
  const { invites, loading: invitesLoading, sendInvite: _sendInvite, revokeInvite } = useInvites();

  const sendInvite = async ({ email, role }) => {
    try {
      const result = await _sendInvite({ email, role });
      toast('invite sent', 'success', email);
      return result;
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to send invite';
      toast('invite failed', 'error', message);
      throw e;
    }
  };

  const cancelInvite = async (id) => {
    try {
      await revokeInvite(id);
      toast('invite revoked');
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to revoke invite';
      toast('revoke failed', 'error', message);
      throw e;
    }
  };

  const updateOrgWithToast = async (data) => {
    try {
      const updated = await updateOrg(data);
      toast('organization saved');
      return updated;
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to save organization';
      toast('save failed', 'error', message);
      throw e;
    }
  };

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
            invites={invites}
            invitesLoading={invitesLoading}
            onSendInvite={sendInvite}
            onCancelInvite={cancelInvite}
          />
        )}
        {tab === 'tokens'  && <TokensTab T={T} />}
        {tab === 'billing' && <BillingTab T={T} memberCount={org?.memberCount ?? members.length} />}
        {tab === 'audit'   && <AuditTab T={T} />}
        {tab === 'settings' && <SettingsTab T={T} org={org} onUpdateOrg={updateOrgWithToast} />}
      </div>
    </div>
  );
}
