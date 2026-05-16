import { useEffect, useMemo, useState } from 'react';
import { Badge, Btn, FONTS, Input } from '@vextis/ui';
import apiService from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SCOPE_GROUPS = [
  { key: 'config', label: 'Config values', scopes: ['config:read', 'config:reveal', 'config:write'] },
  { key: 'parameters', label: 'Parameters', scopes: ['parameters:read', 'parameters:write', 'parameters:delete'] },
  { key: 'resources', label: 'Apps & environments', scopes: ['apps:read', 'apps:manage', 'environments:read', 'environments:manage'] }
];
const SCOPES = SCOPE_GROUPS.flatMap(group => group.scopes);
const TTLS = ['30d', '90d', '365d', 'never'];

function formatDate(value) {
  if (!value) return 'never';
  return new Date(value).toLocaleDateString();
}

function NativeSelect({ T, label, value, onChange, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        style={{
          height: '36px',
          background: T.elevated,
          color: T.textPrimary,
          border: `1px solid ${T.border}`,
          borderRadius: '4px',
          padding: '0 10px',
          fontFamily: FONTS.mono,
          fontSize: '12px',
        }}
      >
        {children}
      </select>
    </label>
  );
}

function ScopeButton({ scope, active, onClick, T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 9px',
        borderRadius: '4px',
        border: `1px solid ${active ? T.termGreenBorder : T.border}`,
        background: active ? T.termGreenBg : T.elevated,
        color: active ? T.termGreen : T.textSecondary,
        fontFamily: FONTS.mono,
        fontSize: '11px',
        cursor: 'pointer'
      }}
    >
      {scope}
    </button>
  );
}

function ScopeGroupSelector({ selectedScopes, onToggle, T }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
      {SCOPE_GROUPS.map(group => (
        <div key={group.key} style={{ background: T.overlay, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '12px' }}>
          <div style={{
            fontFamily: FONTS.mono,
            fontSize: '10px',
            color: T.textMuted,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '9px'
          }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {group.scopes.map(scope => (
              <ScopeButton
                key={scope}
                scope={scope}
                active={selectedScopes.has(scope)}
                onClick={() => onToggle(scope)}
                T={T}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScopeGroupSummary({ scopes, T }) {
  const selected = new Set(scopes ?? []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
      {SCOPE_GROUPS.map(group => {
        const active = group.scopes.filter(scope => selected.has(scope));
        if (active.length === 0) return null;
        return (
          <div key={group.key} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, minWidth: '118px' }}>
              {group.label}
            </span>
            {active.map(scope => (
              <span key={scope} style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: `1px solid ${T.border}`,
                background: T.elevated,
                color: T.textSecondary,
                fontFamily: FONTS.mono,
                fontSize: '10px'
              }}>
                {scope}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function AccessKeysPanel({ T, mode }) {
  const { toast } = useToast();
  const isOrg = mode === 'org';
  const [keys, setKeys] = useState([]);
  const [apps, setApps] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState(null);
  const [form, setForm] = useState({
    name: '',
    orgId: '',
    ttl: '90d',
    scopes: ['config:read', 'config:reveal'],
    appId: '',
    environmentId: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [loadedKeys, loadedApps, loadedEnvs] = await Promise.all([
        isOrg ? apiService.getOrgAccessKeys() : apiService.getPersonalAccessKeys(),
        apiService.orgId ? apiService.getProjects().catch(() => []) : Promise.resolve([]),
        apiService.orgId ? apiService.getEnvironments().catch(() => []) : Promise.resolve([]),
      ]);
      setKeys(loadedKeys);
      setApps(loadedApps);
      setEnvs(loadedEnvs);
    } catch {
      toast('failed to load access keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  const selectedScopes = useMemo(() => new Set(form.scopes), [form.scopes]);

  const toggleScope = (scope) => {
    setForm(prev => {
      const next = new Set(prev.scopes);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return { ...prev, scopes: [...next] };
    });
  };

  const createKey = async () => {
    if (!form.name.trim()) return toast('name is required', 'error');
    if (!isOrg && !apiService.orgId) return toast('select an organization first', 'error');
    if (form.scopes.length === 0) return toast('select at least one scope', 'error');
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        ttl: form.ttl,
        scopes: form.scopes,
        ...(form.appId ? { appId: form.appId } : {}),
        ...(form.environmentId ? { environmentId: form.environmentId } : {}),
        ...(!isOrg ? { orgId: apiService.orgId } : {})
      };
      const created = isOrg
        ? await apiService.createOrgAccessKey(payload)
        : await apiService.createPersonalAccessKey(payload);
      setCreatedToken(created.token);
      setForm(prev => ({ ...prev, name: '' }));
      toast('access key created');
      await load();
    } catch (error) {
      toast('failed to create access key', 'error', error.response?.data?.message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key) => {
    if (!window.confirm(`Revoke ${key.name}?`)) return;
    try {
      if (isOrg) await apiService.revokeOrgAccessKey(key.id);
      else await apiService.revokePersonalAccessKey(key.id);
      toast('access key revoked');
      await load();
    } catch {
      toast('failed to revoke access key', 'error');
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(createdToken);
      toast('token copied');
    } catch {
      toast('copy failed', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {createdToken && (
        <div style={{ background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`, borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '13px', color: T.textPrimary, marginBottom: '8px' }}>Copy this token now. It will not be shown again.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <code style={{ flex: 1, overflowWrap: 'anywhere', fontFamily: FONTS.mono, fontSize: '11px', color: T.termGreen }}>{createdToken}</code>
            <Btn T={T} variant="terminal" size="sm" onClick={copyToken}>copy</Btn>
            <Btn T={T} variant="secondary" size="sm" onClick={() => setCreatedToken(null)}>done</Btn>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 120px', gap: '12px' }}>
        <Input T={T} label="Name" value={form.name} placeholder={isOrg ? 'github deploy' : 'local cli'} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
        <NativeSelect T={T} label="TTL" value={form.ttl} onChange={e => setForm(prev => ({ ...prev, ttl: e.target.value }))}>
          {TTLS.map(ttl => <option key={ttl} value={ttl}>{ttl}</option>)}
        </NativeSelect>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <NativeSelect T={T} label="App scope" value={form.appId} onChange={e => setForm(prev => ({ ...prev, appId: e.target.value }))}>
          <option value="">all apps</option>
          {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
        </NativeSelect>
        <NativeSelect T={T} label="Environment scope" value={form.environmentId} onChange={e => setForm(prev => ({ ...prev, environmentId: e.target.value }))}>
          <option value="">all environments</option>
          {envs.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
        </NativeSelect>
      </div>

      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Scopes
        </div>
        <ScopeGroupSelector selectedScopes={selectedScopes} onToggle={toggleScope} T={T} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn T={T} variant="terminal" size="sm" onClick={createKey} disabled={creating}>{creating ? 'creating...' : 'new access key'}</Btn>
      </div>

      {loading ? (
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>loading...</div>
      ) : keys.length === 0 ? (
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>// no access keys</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {keys.filter(k => isOrg || k.source !== 'CLI').map(key => (
            <div key={key.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: T.overlay, border: `1px solid ${T.border}`, borderRadius: '4px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '13px', color: T.textPrimary }}>{key.name}</span>
                  <Badge T={T} variant={key.revokedAt ? 'default' : 'success'}>{key.revokedAt ? 'revoked' : key.type.toLowerCase()}</Badge>
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginBottom: '4px' }}>{key.tokenPrefix}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: '11px', color: T.textMuted }}>
                  expires: {formatDate(key.expiresAt)} · last used: {formatDate(key.lastUsedAt)}
                </div>
                <ScopeGroupSummary scopes={key.scopes} T={T} />
              </div>
              <Btn T={T} variant="danger" size="sm" onClick={() => revoke(key)} disabled={Boolean(key.revokedAt)}>revoke</Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
