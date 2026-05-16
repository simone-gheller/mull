import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme, Btn, FONTS } from '@vextis/ui';
import {
  LayoutDashboard, Network, ListTree, GitBranch,
  Building2, Users, ShieldCheck, KeyRound, CreditCard, FileClock,
  ChevronsUpDown,
} from 'lucide-react';
import { UserMenu } from './Header';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/api';
import Modal from '../ui/Modal';
import FormInput from '../ui/FormInput';

const ORG_EXPLICIT_TABS = ['members', 'roles', 'tokens', 'billing', 'audit'];

const WORKSPACE_NAV = [
  { Icon: LayoutDashboard, label: 'dashboard',    href: '/dashboard',    end: true },
  { Icon: Network,         label: 'apps',          href: '/dashboard/apps' },
  { Icon: ListTree,        label: 'parameters',   href: '/dashboard/parameters' },
  { Icon: GitBranch,       label: 'environments', href: '/dashboard/environments' },
];

const ORG_NAV = [
  { Icon: Building2,   label: 'overview', tab: null },
  { Icon: Users,       label: 'members',  tab: 'members' },
  { Icon: ShieldCheck, label: 'roles',    tab: 'roles' },
  { Icon: KeyRound,    label: 'tokens',   tab: 'tokens' },
  { Icon: CreditCard,  label: 'billing',  tab: 'billing' },
  { Icon: FileClock,   label: 'audit',    tab: 'audit' },
];

function OrgSwitcher({ T }) {
  const { orgs, orgId, switchOrg } = useAuth();
  const [open, setOpen]           = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState(null);
  const ref = useRef(null);

  const activeOrg = orgs.find(o => o.id === orgId);
  const orgName   = activeOrg?.name ?? '…';
  const orgRole   = activeOrg?.role;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  return (
    <>
      <div ref={ref} style={{ position: 'relative', padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', textAlign: 'left',
            background: open ? T.elevated : 'transparent',
            border: `1px solid ${open ? T.border : 'transparent'}`,
            borderRadius: '5px', padding: '7px 8px',
            cursor: 'pointer', transition: 'background 0.1s',
          }}
        >
          <Building2 size={13} color={T.termGreen} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: '12px', fontWeight: 500, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {orgName}
            </div>
          </div>
          <ChevronsUpDown size={12} strokeWidth={1.5} color={T.textMuted} style={{ flexShrink: 0 }} />
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% - 2px)', left: '10px',
            width: 'calc(100% - 20px)', zIndex: 200,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '6px', overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}>
            <div style={{ padding: '8px 12px 5px', fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              organizations
            </div>
            {orgs.map(org => (
              <div
                key={org.id}
                onClick={() => { switchOrg(org.id); setOpen(false); }}
                onMouseEnter={e => { if (org.id !== orgId) e.currentTarget.style.background = T.overlay; }}
                onMouseLeave={e => { if (org.id !== orgId) e.currentTarget.style.background = 'transparent'; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', cursor: 'pointer',
                  background: org.id === orgId ? T.elevated : 'transparent',
                  borderTop: `1px solid ${T.border}`,
                  transition: 'background 0.1s',
                }}
              >
                <Building2 size={12} color={T.termGreen} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org.name}
                </span>
                {org.id === orgId && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.termGreen, flexShrink: 0 }} />
                )}
              </div>
            ))}
            <div style={{ height: '1px', background: T.border }} />
            <div
              onClick={() => { setOpen(false); setShowCreate(true); }}
              onMouseEnter={e => e.currentTarget.style.background = T.elevated}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{
                padding: '8px 12px', cursor: 'pointer',
                fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted,
                transition: 'background 0.1s',
              }}
            >
              + new organization
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
            maxLength={50}
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

function SectionLabel({ label }) {
  return (
    <div style={{
      fontFamily: FONTS.mono,
      fontSize: '11px', lineHeight: '16px',
      fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
      color: '#7c8798',
      marginTop: '16px', marginBottom: '6px',
      paddingLeft: '14px',
      userSelect: 'none',
    }}>
      {label}
    </div>
  );
}

function SidebarNavItem({ Icon, label, isActive }) {
  const { T } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        height: '36px', padding: '0 12px 0 10px',
        borderLeft: `2px solid ${isActive ? 'var(--color-brand)' : 'transparent'}`,
        borderRadius: '0 6px 6px 0',
        background: isActive
          ? 'rgba(45, 216, 129, 0.05)'
          : hovered ? T.overlay : 'transparent',
        color: isActive || hovered ? 'var(--color-text-primary)' : T.textSecondary,
        fontFamily: FONTS.mono, fontSize: '14px', fontWeight: 500, lineHeight: '20px',
        cursor: 'pointer',
        transition: 'background-color 120ms ease, color 120ms ease',
        userSelect: 'none',
        marginBottom: '1px',
      }}
    >
      <Icon
        size={16}
        strokeWidth={2}
        color={isActive ? 'var(--color-brand)' : hovered ? 'var(--color-text-primary)' : T.textSecondary}
        style={{ flexShrink: 0 }}
      />
      <span>{label}</span>
    </div>
  );
}

export default function Sidebar() {
  const { T } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isOrgSettings = location.pathname === '/settings/org';
  const activeTab = isOrgSettings ? new URLSearchParams(location.search).get('tab') : null;

  function isOrgItemActive(tab) {
    if (!isOrgSettings) return false;
    if (tab === null) return !ORG_EXPLICIT_TABS.includes(activeTab);
    return activeTab === tab;
  }

  return (
    <aside style={{
      width: '200px', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      background: T.surface, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand mark */}
      <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '17px', letterSpacing: '-0.01em', lineHeight: 1 }}>
          <span style={{ color: T.termGreen }}>{'>'}</span>
          <span style={{ color: T.textPrimary }}>v</span>
        </span>
      </div>

      {/* Org switcher */}
      <OrgSwitcher T={T} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 0', overflowY: 'auto' }}>
        <SectionLabel label="Workspace" />
        {WORKSPACE_NAV.map(({ Icon, label, href, end }) => (
          <NavLink key={href} to={href} end={end} style={{ textDecoration: 'none', display: 'block' }}>
            {({ isActive }) => <SidebarNavItem Icon={Icon} label={label} isActive={isActive} />}
          </NavLink>
        ))}

        <SectionLabel label="Organization" />
        {ORG_NAV.map(({ Icon, label, tab }) => {
          const href = tab ? `/settings/org?tab=${tab}` : '/settings/org';
          const isActive = isOrgItemActive(tab);
          return (
            <NavLink key={label} to={href} style={{ textDecoration: 'none', display: 'block' }}>
              {() => <SidebarNavItem Icon={Icon} label={label} isActive={isActive} />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '8px 10px', borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted, paddingLeft: '4px' }}>
          vextis v1.0
        </span>
        <UserMenu T={T} user={user} logout={logout} dropUp />
      </div>
    </aside>
  );
}
