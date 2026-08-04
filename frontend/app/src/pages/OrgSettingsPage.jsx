import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useTheme, FONTS, Btn, Badge, Input } from '@vextis/ui';
import { useOrg } from '../hooks/useOrg';
import { useMembers } from '../hooks/useMembers';
import { useInvites } from '../hooks/useInvites';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
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

function formatPlan(plan) {
  if (plan === 'ENTERPRISE') return 'Custom';
  return String(plan || 'FREE').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function formatLimit(value) {
  return value === null ? 'unlimited' : value;
}

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-paddle-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.dataset.paddleJs = 'true';
    script.onload = () => resolve(window.Paddle);
    script.onerror = reject;
    document.head.appendChild(script);
  });
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
  const unlimited = total === null;
  const pct = unlimited ? 0 : total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color = pct > 85 ? T.red : pct > 65 ? T.amber : T.termGreen;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
          {unlimited ? `${used} / unlimited ${unit}` : `${used} / ${total} ${unit}`}
        </span>
      </div>
      <div style={{ height: '4px', background: T.elevated, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${unlimited ? 100 : pct}%`, background: unlimited ? T.borderHover : color,
          borderRadius: '2px', transition: 'width 0.6s ease',
          boxShadow: unlimited ? 'none' : `0 0 6px ${color}40`,
        }} />
      </div>
    </div>
  );
}

function Skeleton({ height = 40, T }) {
  return <div style={{ height, borderRadius: '6px', background: T.elevated, border: `1px solid ${T.border}`, marginBottom: '8px' }} />;
}

const ROLE_VARIANT = { OWNER: 'warning', ADMIN: 'info', DEVELOPER: 'success', VIEWER: 'default' };
const TABS = ['members', 'roles', 'tokens', 'billing', 'audit', 'settings'];
const MEMBERS_PAGE_SIZE = 10;

// ── Role select ──────────────────────────────────────────────

function RoleSelect({ value, onChange, roles, T, allowOwner = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const options = (roles ?? [])
    .filter(role => allowOwner || role.key !== 'OWNER')
    .map(role => ({ value: role.id, label: role.name || role.key.toLowerCase() }));
  const selected = options.find(o => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <style>{`.org-role-menu::-webkit-scrollbar { display: none; }`}</style>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
          background: T.surface, border: `1px solid ${open ? T.borderHover : T.border}`,
          borderRadius: '4px', padding: '8px 12px',
          fontFamily: FONTS.mono, fontSize: '12px', color: T.textSecondary,
          cursor: disabled ? 'not-allowed' : 'pointer', transition: 'border-color 0.1s',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{selected?.label ?? 'role'}</span>
        <ChevronDown size={12} color={T.textMuted} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="org-role-menu" style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          background: '#101315',
          border: `1px solid ${T.borderHover}`,
          borderRadius: '6px',
          zIndex: 80,
          boxShadow: '0 14px 36px rgba(0,0,0,0.44)',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          maxHeight: '144px',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseEnter={() => setHov(opt.value)}
              onMouseLeave={() => setHov(null)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                minHeight: '48px',
                padding: '0 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: FONTS.mono, fontSize: '12px',
                color: opt.value === value ? T.textPrimary : T.textSecondary,
                background: hov === opt.value ? '#202428' : (opt.value === value ? '#1a1f23' : 'transparent'),
                transition: 'background 0.1s',
              }}
            >
              <span style={{ flex: 1 }}>{opt.label}</span>
              {opt.value === value && <Check size={14} color={T.textPrimary} strokeWidth={2} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Members tab ──────────────────────────────────────────────

function MemberRow({ member, isYou, roles, onUpdateRole, onRemove, T }) {
  const [hover, setHover] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [removing, setRemoving] = useState(false);
  const role = member.role.toLowerCase();
  const name = member.displayName || member.email.split('@')[0];
  const selectedRoleId = member.roleId ?? roles.find(option => option.key === member.role)?.id ?? '';
  const isOwner = member.role === 'OWNER';
  const canEditRole = !isYou && !isOwner;
  const canRemove = !isYou && !isOwner;

  const handleRoleChange = async (roleId) => {
    if (!roleId || roleId === selectedRoleId) return;
    setSavingRole(true);
    try {
      await onUpdateRole(member, roleId);
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(member);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: 'minmax(190px, 1fr) minmax(260px, 1.2fr) 180px 120px',
        gap: '16px', alignItems: 'center',
        padding: '12px 14px', borderBottom: `1px solid ${T.border}`,
        margin: '0 -14px',
        borderRadius: '6px',
        background: hover ? T.overlay : 'transparent',
        transition: 'background 0.12s ease',
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
        </div>
      </div>

      <div style={{
        fontFamily: FONTS.display,
        fontSize: '12px',
        color: T.textSecondary,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {member.email}
      </div>

      <div>
        {canEditRole ? (
          <RoleSelect
            value={selectedRoleId}
            onChange={handleRoleChange}
            roles={roles}
            disabled={savingRole || removing}
            T={T}
          />
        ) : (
          <div>
            <div style={{
              fontFamily: FONTS.mono, fontSize: '12px', color: T.textSecondary,
              background: T.elevated, border: `1px solid ${T.border}`,
              borderRadius: '4px', padding: '8px 12px',
            }}>
              {role}
            </div>
            {isYou && (
              <div style={{ marginTop: '5px', fontFamily: FONTS.display, fontSize: '10px', color: T.textMuted }}>
                your own role is locked
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {(hover || removing) && canRemove && (
          <button
            onClick={handleRemove}
            disabled={removing || savingRole}
            style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.red, padding: '3px 6px',
          }}>
            {removing ? '…' : 'remove'}
          </button>
        )}
      </div>
    </div>
  );
}

function InviteBar({ onSendInvite, roles, T }) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

  useEffect(() => {
    if (!roleId && roles?.length) {
      const fallback = roles.find(role => role.key === 'DEVELOPER') ?? roles.find(role => role.key !== 'OWNER');
      if (fallback) setRoleId(fallback.id);
    }
  }, [roles, roleId]);

  const handleSend = async () => {
    if (!email.trim() || !roleId) return;
    setSending(true);
    setFeedback(null);
    try {
      await onSendInvite({ email: email.trim(), roleId });
      setEmail('');
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
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '16px',
      }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '14px' }}>
          add user to your org
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 520px) 180px 132px',
          gap: '10px',
          alignItems: 'end',
          maxWidth: '860px',
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>email</span>
            <Input
              T={T}
              placeholder="colleague@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>role</span>
            <RoleSelect value={roleId} onChange={setRoleId} roles={roles} T={T} />
          </label>
          <Btn
            T={T}
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={sending || !email.trim() || !roleId}
            style={{ width: '100%', justifyContent: 'center', whiteSpace: 'nowrap' }}
          >
            {sending ? 'sending…' : '+ send invite'}
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

function MembersTab({ members, membersLoading, membersError, currentUserId, invites, invitesLoading, roles, onSendInvite, onCancelInvite, onUpdateMemberRole, onRemoveMember, T }) {
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const memberCountRef = useRef(null);
  const normalizedSearch = memberSearch.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!normalizedSearch) return members;
    return members.filter(member => {
      const email = String(member.email ?? '');
      const name = String(member.displayName || email.split('@')[0] || '');
      const role = String(member.roleName || member.role || '');
      return `${name} ${email} ${role}`.toLowerCase().includes(normalizedSearch);
    });
  }, [members, normalizedSearch]);
  const filterActive = normalizedSearch.length > 0;
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PAGE_SIZE));
  const safePage = Math.min(memberPage, pageCount);
  const pageStart = (safePage - 1) * MEMBERS_PAGE_SIZE;
  const pageMembers = filteredMembers.slice(pageStart, pageStart + MEMBERS_PAGE_SIZE);

  useEffect(() => {
    setMemberPage(1);
  }, [memberSearch, members.length]);

  useEffect(() => {
    if (memberPage > pageCount) setMemberPage(pageCount);
  }, [memberPage, pageCount]);

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
      <InviteBar onSendInvite={onSendInvite} roles={roles} T={T} />

      <UsageBar T={T} label="seats" used={members.length} total={25} unit="members" />

      <Section T={T} title="Active Members">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '14px',
        }}>
          <div style={{ position: 'relative', width: 'min(100%, 320px)' }}>
            <style>{`.member-search-input::-webkit-search-cancel-button { cursor: pointer; }`}</style>
            <Search size={14} color={T.textMuted} strokeWidth={1.8} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }} />
            <input
              className="member-search-input"
              type="search"
              placeholder="search members..."
              value={memberSearch}
              onChange={event => setMemberSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  memberCountRef.current?.focus();
                }
              }}
              style={{
                width: '100%',
                height: '36px',
                background: filterActive ? T.elevated : T.surface,
                border: `1px solid ${filterActive ? T.borderHover : T.border}`,
                borderRadius: '4px',
                padding: '0 12px 0 34px',
                color: T.textPrimary,
                fontFamily: FONTS.mono,
                fontSize: '12px',
                outline: 'none',
                opacity: filterActive ? 1 : 0.72,
                boxShadow: filterActive ? `0 0 0 1px ${T.borderHover} inset` : 'none',
                transition: 'opacity 0.12s ease, background 0.12s ease, border-color 0.12s ease',
              }}
            />
          </div>
          <div
            ref={memberCountRef}
            tabIndex={-1}
            style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, flexShrink: 0, outline: 'none' }}
          >
            {filteredMembers.length} / {members.length} members
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(190px, 1fr) minmax(260px, 1.2fr) 180px 120px',
          gap: '16px',
          padding: '0 14px 9px',
          borderBottom: `1px solid ${T.border}`,
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: T.textMuted,
        }}>
          <div>member</div>
          <div>email</div>
          <div>role</div>
          <div style={{ textAlign: 'right' }}>actions</div>
        </div>
        {pageMembers.length === 0 ? (
          <div style={{
            padding: '18px 0',
            fontFamily: FONTS.mono,
            fontSize: '11px',
            color: T.textMuted,
          }}>
            no members match "{memberSearch}"
          </div>
        ) : (
          pageMembers.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              isYou={m.id === currentUserId}
              roles={roles}
              onUpdateRole={onUpdateMemberRole}
              onRemove={onRemoveMember}
              T={T}
            />
          ))
        )}
        {filteredMembers.length > MEMBERS_PAGE_SIZE && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '12px',
          }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
              showing {pageStart + 1}-{Math.min(pageStart + MEMBERS_PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMemberPage(page => Math.max(1, page - 1))}
                disabled={safePage === 1}
                style={{
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.textSecondary,
                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                  opacity: safePage === 1 ? 0.45 : 1,
                }}
              >
                <ChevronLeft size={15} strokeWidth={1.8} />
              </button>
              <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
                {safePage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setMemberPage(page => Math.min(pageCount, page + 1))}
                disabled={safePage === pageCount}
                style={{
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.textSecondary,
                  cursor: safePage === pageCount ? 'not-allowed' : 'pointer',
                  opacity: safePage === pageCount ? 0.45 : 1,
                }}
              >
                <ChevronRight size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
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

const ROLE_SCOPE_GROUPS = [
  { key: 'org', label: 'Organization', scopes: ['org:read', 'org:update'] },
  { key: 'members', label: 'Members', scopes: ['members:read', 'members:manage', 'roles:read', 'roles:manage'] },
  { key: 'apps', label: 'Apps & Environments', scopes: ['apps:read', 'apps:manage', 'environments:read', 'environments:manage'] },
  { key: 'parameters', label: 'Parameters', scopes: ['parameters:read', 'parameters:write', 'parameters:delete'] },
  { key: 'config', label: 'Config Values', scopes: ['config:read', 'config:reveal', 'config:write'] },
  { key: 'security', label: 'Security & Audit', scopes: ['access_keys:read', 'access_keys:manage', 'audit:read'] }
];

const ROLE_SCOPES = ROLE_SCOPE_GROUPS.flatMap(group => group.scopes);

function ScopePill({ scope, active, onClick, disabled = false, T }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '6px 9px',
        borderRadius: '4px',
        border: `1px solid ${active ? T.termGreenBorder : T.border}`,
        background: active ? T.termGreenBg : T.elevated,
        color: active ? T.termGreen : T.textSecondary,
        fontFamily: FONTS.mono,
        fontSize: '11px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {scope}
    </button>
  );
}

function ScopeGroups({ selectedScopes, onToggle, disabled = false, T }) {
  const selected = new Set(selectedScopes);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
      {ROLE_SCOPE_GROUPS.map(group => (
        <div key={group.key} style={{ border: `1px solid ${T.border}`, borderRadius: '6px', padding: '12px', background: T.overlay }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '9px' }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {group.scopes.map(scope => (
              <ScopePill
                key={scope}
                scope={scope}
                active={selected.has(scope)}
                disabled={disabled}
                onClick={() => onToggle?.(scope)}
                T={T}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleScopeDetails({ role, T }) {
  const selected = new Set((role.permissions ?? []).map(permission => permission.scope));
  return (
    <div style={{ padding: '0 14px 14px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', paddingTop: '12px' }}>
        {ROLE_SCOPE_GROUPS.map(group => {
          const scopes = group.scopes.filter(scope => selected.has(scope));
          return (
            <div key={group.key} style={{ border: `1px solid ${T.border}`, borderRadius: '6px', padding: '10px', background: T.overlay }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                {group.label}
              </div>
              {scopes.length === 0 ? (
                <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>no scopes</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {scopes.map(scope => (
                    <span key={scope} style={{
                      padding: '4px 7px',
                      borderRadius: '4px',
                      border: `1px solid ${T.border}`,
                      background: T.elevated,
                      color: T.textSecondary,
                      fontFamily: FONTS.mono,
                      fontSize: '10px',
                    }}>
                      {scope}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateRoleModal({ open, paid, name, setName, permissions, setPermissions, saving, onCreate, onClose, T }) {
  if (!open) return null;
  const selected = new Set(permissions);
  const toggle = scope => {
    setPermissions(prev => prev.includes(scope) ? prev.filter(item => item !== scope) : [...prev, scope]);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(0,0,0,0.62)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: 'min(820px, 100%)',
        maxHeight: 'min(760px, 92vh)',
        overflowY: 'auto',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.48)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 18px',
          borderBottom: `1px solid ${T.border}`,
          background: T.overlay,
        }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary }}>create custom role</div>
            <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted, marginTop: '2px' }}>
              Name the role and choose the scopes it grants.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              color: T.textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '18px' }}>
          {!paid && (
            <div style={{
              marginBottom: '14px',
              padding: '10px 12px',
              border: `1px solid ${T.amberBorder}`,
              background: T.amberBg,
              color: T.amber,
              borderRadius: '4px',
              fontFamily: FONTS.display,
              fontSize: '12px',
            }}>
              Custom roles are available on paid plans.
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>role name</span>
            <Input T={T} value={name} placeholder="Platform engineer" onChange={e => setName(e.target.value)} disabled={!paid || saving} />
          </label>

          <ScopeGroups
            selectedScopes={permissions}
            onToggle={toggle}
            disabled={!paid || saving}
            T={T}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginTop: '18px',
          }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>
              {selected.size} / {ROLE_SCOPES.length} scopes selected
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Btn T={T} variant="secondary" size="sm" onClick={onClose} disabled={saving}>cancel</Btn>
              <Btn T={T} variant="primary" size="sm" onClick={onCreate} disabled={!paid || saving || !name.trim()}>
                {saving ? 'creating...' : 'create role'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleRow({ role, open, onToggle, T }) {
  const permissionCount = (role.permissions ?? []).length;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 120px 120px 28px',
          gap: '16px',
          alignItems: 'center',
          padding: '12px 14px',
          background: open ? T.overlay : 'transparent',
          border: 'none',
          borderBottom: `1px solid ${T.border}`,
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {role.name}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {role.description || role.key}
          </div>
        </div>
        <Badge T={T} variant={role.kind === 'SYSTEM' ? 'default' : 'info'}>{role.kind.toLowerCase()}</Badge>
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>{permissionCount} scopes</div>
        <ChevronDown
          size={15}
          color={T.textMuted}
          strokeWidth={1.8}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
        />
      </button>
      <div
        aria-hidden={!open}
        style={{
          maxHeight: open ? '520px' : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.28s ease, opacity 0.18s ease',
        }}
      >
        <div style={{
          transform: open ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'transform 0.28s ease',
        }}>
          <RoleScopeDetails role={role} T={T} />
        </div>
      </div>
    </div>
  );
}

function RolesTab({ org, roles, onRefresh, T }) {
  const { toast } = useToast();
  const paid = org?.plan === 'TEAM' || org?.plan === 'BUSINESS' || org?.plan === 'ENTERPRISE';
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState(['org:read', 'apps:read', 'environments:read', 'parameters:read', 'config:read']);
  const [saving, setSaving] = useState(false);
  const [openRoleId, setOpenRoleId] = useState(null);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiService.createRole({ name: name.trim(), permissions: permissions.map(scope => ({ scope })) });
      setName('');
      setPermissions(['org:read', 'apps:read', 'environments:read', 'parameters:read', 'config:read']);
      setModalOpen(false);
      await onRefresh();
      toast('role created');
    } catch (error) {
      toast('role creation failed', 'error', error.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Section T={T} title="Org Roles" description="Roles are org-wide presets of scopes. Custom roles are available on paid plans.">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <Btn T={T} variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            + create role
          </Btn>
        </div>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 120px 120px 28px',
            gap: '16px',
            padding: '0 14px 9px',
            borderBottom: `1px solid ${T.border}`,
            fontFamily: FONTS.mono,
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: T.textMuted,
          }}>
            <div>role</div>
            <div>kind</div>
            <div>permissions</div>
            <div />
          </div>
          {roles.map(role => (
            <RoleRow
              key={role.id}
              role={role}
              open={openRoleId === role.id}
              onToggle={() => setOpenRoleId(current => current === role.id ? null : role.id)}
              T={T}
            />
          ))}
        </div>
      </Section>

      <CreateRoleModal
        open={modalOpen}
        paid={paid}
        name={name}
        setName={setName}
        permissions={permissions}
        setPermissions={setPermissions}
        saving={saving}
        onCreate={create}
        onClose={() => setModalOpen(false)}
        T={T}
      />
    </div>
  );
}

// ── Billing tab ──────────────────────────────────────────────

function BillingTab({ T }) {
  const { toast } = useToast();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBilling(await apiService.getBilling());
    } catch (error) {
      toast('billing unavailable', 'error', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCheckout = async (plan, interval = 'month') => {
    setBusy(`${plan}-${interval}`);
    try {
      const checkout = await apiService.createBillingCheckout({ plan, interval });
      const Paddle = await loadPaddleScript();
      if (checkout.environment === 'sandbox') Paddle.Environment.set('sandbox');
      if (!window.__vextisPaddleInitialized) {
        Paddle.Initialize({
          token: checkout.clientToken,
          checkout: { settings: { displayMode: 'overlay', variant: 'one-page', theme: 'dark', locale: 'en' } }
        });
        window.__vextisPaddleInitialized = true;
      }
      Paddle.Checkout.open({
        items: checkout.items,
        customer: checkout.customer,
        customData: checkout.customData,
        settings: checkout.settings
      });
    } catch (error) {
      toast('checkout failed', 'error', error.response?.data?.message || error.message);
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    try {
      const session = await apiService.createBillingPortalSession();
      if (session.url) window.location.href = session.url;
    } catch (error) {
      toast('portal failed', 'error', error.response?.data?.message || error.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Skeleton height={160} T={T} />;

  const plan = billing?.plan || 'FREE';
  const subscription = billing?.subscription;
  const limits = billing?.limits || {};
  const usage = billing?.usage || {};
  const paid = plan !== 'FREE';
  const headline = plan === 'FREE' ? '$0' : plan === 'TEAM' ? '$49' : plan === 'BUSINESS' ? '$149' : 'custom';
  const renewal = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

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
            <span style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '28px', color: T.textPrimary }}>{headline}</span>
            {plan !== 'ENTERPRISE' && <span style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>/month</span>}
            <span style={{
              fontFamily: FONTS.mono, fontSize: '11px', letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: '3px', textTransform: 'uppercase',
              background: T.elevated, color: T.textMuted, border: `1px solid ${T.border}`,
            }}>{formatPlan(plan)}</span>
            {subscription?.status && <span style={{
              fontFamily: FONTS.mono, fontSize: '11px', letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: '3px', textTransform: 'uppercase',
              background: T.overlay, color: T.textSecondary, border: `1px solid ${T.border}`,
            }}>{subscription.status.toLowerCase()}</span>}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, marginTop: '4px' }}>
            {renewal ? `${subscription.cancelAtPeriodEnd ? 'Access ends' : 'Next renewal'} ${renewal}` : 'No billing card required'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {paid && <Btn T={T} variant="secondary" size="sm" onClick={openPortal} disabled={busy === 'portal'}>manage billing</Btn>}
          {plan !== 'BUSINESS' && plan !== 'ENTERPRISE' && (
            <Btn T={T} variant="warning" size="sm" onClick={() => openCheckout(plan === 'FREE' ? 'TEAM' : 'BUSINESS')} disabled={!!busy}>
              {plan === 'FREE' ? 'upgrade team' : 'upgrade business'}
            </Btn>
          )}
          {plan === 'ENTERPRISE' && <Btn T={T} variant="secondary" size="sm" disabled>contact support</Btn>}
        </div>
      </div>

      <Section T={T} title="Usage This Period">
        <UsageBar T={T} label="members" used={usage.members ?? 0} total={limits.members} unit="members" />
        <UsageBar T={T} label="apps" used={usage.apps ?? 0} total={limits.apps} unit="apps" />
        <UsageBar T={T} label="values" used={usage.parameterValues ?? 0} total={limits.parameterValues} unit="values" />
        <UsageBar T={T} label="service tokens" used={usage.serviceTokens ?? 0} total={limits.serviceTokens} unit="tokens" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Badge T={T} variant={limits.customRoles ? 'success' : 'default'}>{limits.customRoles ? 'custom roles' : 'no custom roles'}</Badge>
          <Badge T={T} variant="default">{formatLimit(limits.auditRetentionDays)} day audit</Badge>
          <Badge T={T} variant="default">{formatLimit(limits.parameterValueVersions)} versions</Badge>
        </div>
      </Section>

      <Section T={T} title="Self-Serve Plans" description="Annual billing includes two months free.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { plan: 'TEAM', price: '$49', yearly: '$490/year', text: '5 members, 25 apps, 90-day audit' },
            { plan: 'BUSINESS', price: '$149', yearly: '$1490/year', text: '15 members, 100 apps, 1-year audit' }
          ].map(tier => (
            <div key={tier.plan} style={{ border: `1px solid ${T.border}`, borderRadius: '6px', padding: '14px', background: T.overlay }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textPrimary, marginBottom: '8px' }}>{tier.plan.toLowerCase()}</div>
              <div style={{ fontFamily: FONTS.display, fontSize: '24px', fontWeight: 700, color: T.textPrimary }}>{tier.price}<span style={{ fontSize: '11px', color: T.textMuted }}> /mo</span></div>
              <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted, margin: '6px 0 14px' }}>{tier.text}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Btn T={T} variant="secondary" size="sm" onClick={() => openCheckout(tier.plan, 'month')} disabled={!!busy}>{busy === `${tier.plan}-month` ? 'opening...' : 'monthly'}</Btn>
                <Btn T={T} variant="secondary" size="sm" onClick={() => openCheckout(tier.plan, 'year')} disabled={!!busy}>{busy === `${tier.plan}-year` ? 'opening...' : tier.yearly}</Btn>
              </div>
            </div>
          ))}
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

  const loadEvents = useCallback(async ({ append = false, cursor: next = null } = {}) => {
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
  }, [filters.action, filters.resourceType, filters.outcome]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [sso, setSso] = useState(null);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [ssoSaving, setSsoSaving] = useState(false);
  const [ssoMode, setSsoMode] = useState('OFF');
  const [ownerFallback, setOwnerFallback] = useState(true);
  const [connection, setConnection] = useState({
    supabaseSsoProviderId: '',
    name: '',
    domains: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    if (org?.name != null) setName(org.name);
  }, [org?.name]);

  const loadSso = useCallback(async () => {
    setSsoLoading(true);
    try {
      const settings = await apiService.getOrgSsoSettings();
      setSso(settings);
      setSsoMode(settings.policy?.ssoMode ?? 'OFF');
      setOwnerFallback(settings.policy?.allowPasswordFallbackForOwners ?? true);
      setConnection({
        supabaseSsoProviderId: settings.connection?.supabaseSsoProviderId ?? '',
        name: settings.connection?.name ?? '',
        domains: (settings.connection?.domains ?? []).join(', '),
        status: settings.connection?.status ?? 'DRAFT',
      });
    } catch (e) {
      toast('sso settings unavailable', 'error', e.response?.data?.message || e.message);
    } finally {
      setSsoLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadSso(); }, [org?.id, loadSso]);

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

  const saveSso = async () => {
    setSsoSaving(true);
    try {
      const hasConnectionInput = connection.supabaseSsoProviderId || connection.name || connection.domains;
      const updated = await apiService.updateOrgSsoSettings({
        ssoMode,
        allowPasswordFallbackForOwners: ownerFallback,
        ...(hasConnectionInput ? {
          connection: {
            supabaseSsoProviderId: connection.supabaseSsoProviderId,
            name: connection.name,
            domains: connection.domains.split(',').map(value => value.trim()).filter(Boolean),
            status: connection.status,
          }
        } : {})
      });
      setSso(updated);
      toast('sso settings saved');
    } catch (e) {
      toast('sso save failed', 'error', e.response?.data?.message || e.message);
    } finally {
      setSsoSaving(false);
    }
  };

  const ssoEligible = Boolean(sso?.eligible);
  const ssoLocked = sso && !ssoEligible;

  return (
    <div>
      <Section T={T} title="Organization Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <Input
            T={T}
            label="Org Name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
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

      <Section T={T} title="Company SSO" description="Manual-assisted SAML SSO for Business and Custom organizations">
        {ssoLoading ? (
          <Skeleton height={120} T={T} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: T.overlay,
              border: `1px solid ${T.border}`, borderRadius: '4px',
            }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>
                  {connection.name || 'SAML connection'}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
                  {ssoLocked ? 'Requires Business or Custom plan' : (sso?.connection ? connection.domains || 'No domains set' : 'Setup is assisted by vextis support')}
                </div>
              </div>
              <Badge T={T} variant={ssoEligible ? (connection.status === 'ACTIVE' ? 'success' : 'warning') : 'default'}>
                {ssoEligible ? connection.status.toLowerCase() : 'locked'}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                T={T}
                label="Provider name"
                value={connection.name}
                onChange={e => setConnection(prev => ({ ...prev, name: e.target.value }))}
                readOnly={!ssoEligible}
                placeholder="Acme Microsoft Entra"
              />
              <Input
                T={T}
                label="Supabase SSO provider ID"
                value={connection.supabaseSsoProviderId}
                onChange={e => setConnection(prev => ({ ...prev, supabaseSsoProviderId: e.target.value }))}
                readOnly={!ssoEligible}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
              <Input
                T={T}
                label="Domains"
                value={connection.domains}
                onChange={e => setConnection(prev => ({ ...prev, domains: e.target.value }))}
                readOnly={!ssoEligible}
                hint="Comma-separated, for example acme.com"
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>Connection status</span>
                <select
                  value={connection.status}
                  disabled={!ssoEligible}
                  onChange={e => setConnection(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
                    color: T.textSecondary, fontFamily: FONTS.mono, fontSize: '12px', padding: '9px 10px',
                  }}
                >
                  <option value="DRAFT">draft</option>
                  <option value="ACTIVE">active</option>
                  <option value="DISABLED">disabled</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>SSO mode</span>
                <select
                  value={ssoMode}
                  disabled={!ssoEligible}
                  onChange={e => setSsoMode(e.target.value)}
                  style={{
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: '4px',
                    color: T.textSecondary, fontFamily: FONTS.mono, fontSize: '12px', padding: '9px 10px',
                  }}
                >
                  <option value="OFF">off</option>
                  <option value="OPTIONAL">optional</option>
                  <option value="REQUIRED">required</option>
                </select>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                paddingTop: '20px',
                fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary,
              }}>
                <input
                  type="checkbox"
                  checked={ownerFallback}
                  disabled={!ssoEligible}
                  onChange={e => setOwnerFallback(e.target.checked)}
                />
                allow owner password fallback
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn T={T} variant={ssoEligible ? 'primary' : 'warning'} size="sm" onClick={saveSso} disabled={!ssoEligible || ssoSaving}>
                {ssoLocked ? 'upgrade business' : ssoSaving ? 'saving…' : 'save sso'}
              </Btn>
            </div>
          </div>
        )}
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
  const { members, loading: membersLoading, error: membersError, refetch: refetchMembers } = useMembers();
  const { invites, loading: invitesLoading, sendInvite: _sendInvite, revokeInvite } = useInvites();
  const [roles, setRoles] = useState([]);

  const loadRoles = useCallback(async () => {
    try {
      setRoles(await apiService.getRoles());
    } catch (error) {
      toast('failed to load roles', 'error', error.response?.data?.message);
    }
  }, [toast]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const sendInvite = async ({ email, roleId }) => {
    try {
      const result = await _sendInvite({ email, roleId });
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

  const updateMemberRole = async (member, roleId) => {
    const nextRole = roles.find(role => role.id === roleId);
    try {
      await apiService.updateMemberRole(member.id, roleId);
      await refetchMembers();
      toast('member role updated', 'success', `${member.email} → ${nextRole?.name ?? 'role'}`);
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to update member role';
      toast('role update failed', 'error', message);
      throw e;
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.email} from this organization?`)) return;
    try {
      await apiService.removeMember(member.id);
      await refetchMembers();
      toast('member removed', 'success', member.email);
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to remove member';
      toast('remove failed', 'error', message);
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

  const [searchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'settings';

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
        // organization · {tab}
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

      {/* Tab content */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '24px',
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
            roles={roles}
            onSendInvite={sendInvite}
            onCancelInvite={cancelInvite}
            onUpdateMemberRole={updateMemberRole}
            onRemoveMember={removeMember}
          />
        )}
        {tab === 'roles'    && <RolesTab T={T} org={org} roles={roles} onRefresh={loadRoles} />}
        {tab === 'tokens'   && <TokensTab T={T} />}
        {tab === 'billing'  && <BillingTab T={T} />}
        {tab === 'audit'    && <AuditTab T={T} />}
        {tab === 'settings' && <SettingsTab T={T} org={org} onUpdateOrg={updateOrgWithToast} />}
      </div>
    </div>
  );
}
