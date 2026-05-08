import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme, Btn, FONTS } from '@mull/ui';
import { Building2, User, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';
import Modal from '../ui/Modal';
import FormInput from '../ui/FormInput';

function OrgSwitcher({ T }) {
  const { orgs, orgId, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const orgName = orgs.find(o => o.id === orgId)?.name ?? '…';

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post('/orgs', { name: newOrgName.trim() });
      window.location.reload();
    } catch (e) {
      setCreateError(e.response?.data?.message || 'Failed to create organization');
      setCreating(false);
    }
  };

  const TRIGGER_WIDTH = 220;

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: `${TRIGGER_WIDTH}px`,
            background: hov || open ? T.elevated : 'transparent',
            border: '1px solid transparent',
            borderRadius: '4px', padding: '6px 10px',
            cursor: 'pointer', transition: 'background 0.1s',
          }}
        >
          <Building2 size={14} color={T.termGreen} strokeWidth={1.5} flexShrink={0} />
          <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {orgName}
          </span>
          <ChevronsUpDown size={13} strokeWidth={1.5} color={T.textMuted} style={{ flexShrink: 0 }} />
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            width: `${TRIGGER_WIDTH}px`, zIndex: 100,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '6px', overflow: 'hidden',
            boxShadow: `0 4px 20px ${T.shadow ?? 'rgba(0,0,0,0.35)'}`,
          }}>
            <div style={{ padding: '10px 14px 6px', fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              organizations
            </div>
            {orgs.map(org => (
              <div
                key={org.id}
                onClick={() => { switchOrg(org.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', cursor: 'pointer',
                  background: org.id === orgId ? T.elevated : 'transparent',
                  borderTop: `1px solid ${T.border}`,
                  transition: 'background 0.1s',
                }}
              >
                <Building2 size={13} color={T.termGreen} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org.name}
                </span>
                {org.id === orgId && (
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: T.termGreen, flexShrink: 0,
                    boxShadow: `0 0 6px ${T.termGreen}80`,
                  }} />
                )}
              </div>
            ))}
            <div style={{ height: '1px', background: T.border }} />
            <div
              onClick={() => { setOpen(false); setShowCreate(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', cursor: 'pointer',
                fontFamily: FONTS.mono, fontSize: '12px', color: T.textMuted,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.elevated}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              + create new organization
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setNewOrgName(''); setCreateError(null); }}
        title="new organization"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Organization name"
            placeholder="Acme Corp"
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
            autoFocus
          />
          {createError && (
            <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>{createError}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowCreate(false); setNewOrgName(''); setCreateError(null); }}>cancel</Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreateOrg} disabled={!newOrgName.trim() || creating}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function UserMenu({ T, user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'me';
  const email = user?.email || '';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Your profile"
        style={{
          display: 'flex', alignItems: 'center',
          padding: '4px', borderRadius: '4px', border: `1px solid ${T.border}`,
          color: T.textMuted, background: open ? T.elevated : 'transparent',
          cursor: 'pointer', transition: 'all 0.1s',
        }}
      >
        <User size={16} strokeWidth={1.5} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          minWidth: '200px', zIndex: 100,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', overflow: 'hidden',
          boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
        }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, background: T.overlay }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, marginBottom: '2px' }}>{displayName}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>{email}</div>
          </div>
          {[
            { label: 'profile settings', href: '/settings/profile' },
            { label: 'security',         href: '/settings/security' },
            { label: 'personal tokens',  href: '/settings/tokens' },
          ].map(({ label, href }) => (
            <NavLink key={href} to={href} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
              {({ isActive }) => (
                <div style={{
                  padding: '8px 12px', fontFamily: FONTS.mono, fontSize: '12px',
                  color: isActive ? T.textPrimary : T.textSecondary, cursor: 'pointer',
                  background: isActive ? T.elevated : 'transparent',
                }}>
                  {label}
                </div>
              )}
            </NavLink>
          ))}
          <div style={{ height: '1px', background: T.border }} />
          <button
            onClick={() => { setOpen(false); logout(); }}
            style={{
              width: '100%', padding: '8px 12px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: FONTS.mono, fontSize: '12px', color: T.red,
            }}
          >
            logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { T, toggle, mode } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: '48px', flexShrink: 0,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Left — org switcher only */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <OrgSwitcher T={T} />
      </div>

      {/* Right — theme toggle + user menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={toggle} aria-label={mode === 'dark' ? 'switch to light mode' : 'switch to dark mode'} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: '4px',
          cursor: 'pointer', fontFamily: FONTS.mono, fontSize: '11px',
          color: T.textMuted, padding: '4px 10px',
        }}>
          {mode === 'dark' ? '☀' : '●'}
        </button>
        <UserMenu T={T} user={user} logout={logout} />
      </div>
    </header>
  );
}
