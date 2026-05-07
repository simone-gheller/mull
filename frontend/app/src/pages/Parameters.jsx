import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme, Btn, FONTS, AppTreeA, buildAppTree } from '@mull/ui';
import { Layers, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

function EnvDropdown({ environments, selectedEnvId, onSelect, T }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedName = environments.find(e => e.id === selectedEnvId)?.name ?? '—';

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger — styled like FormInput with prefix icon */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: T.surface, borderRadius: '4px',
        border: `1px solid ${open ? T.termGreen : T.border}`,
        boxShadow: open ? `0 0 0 3px ${T.termGreenBg}` : 'none',
        transition: 'all 0.13s', overflow: 'hidden',
        cursor: 'pointer',
      }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Icon prefix — same pattern as FormInput */}
        <span style={{
          padding: '0 10px',
          background: T.overlay,
          borderRight: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
        }}>
          <Layers size={13} color={T.textMuted} strokeWidth={1.5} />
        </span>

        {/* Selected env name + chevron */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px',
          fontFamily: FONTS.mono, fontSize: '11px', color: T.textPrimary,
          minWidth: '110px',
        }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedName}
          </span>
          <ChevronsUpDown size={12} color={T.textMuted} strokeWidth={1.5} />
        </div>
      </div>

      {/* Dropdown */}
      {open && environments.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: '100%', zIndex: 50,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', overflow: 'hidden',
          boxShadow: `0 4px 16px ${T.shadow ?? 'rgba(0,0,0,0.3)'}`,
        }}>
          <div style={{
            padding: '5px 10px 3px',
            fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            environments
          </div>
          {environments.map((env, i) => (
            <div
              key={env.id}
              onClick={() => { onSelect(env.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px',
                background: env.id === selectedEnvId ? T.elevated : 'transparent',
                borderTop: i === 0 ? `1px solid ${T.border}` : `1px solid ${T.border}`,
                cursor: 'pointer', transition: 'background 0.1s',
                fontFamily: FONTS.mono, fontSize: '11px', color: T.textPrimary,
              }}
            >
              <span style={{ flex: 1 }}>{env.name}</span>
              {env.isSecret && (
                <span style={{
                  fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
                  background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                  padding: '1px 5px', borderRadius: '2px',
                }}>◈</span>
              )}
              {env.id === selectedEnvId && (
                <span style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.termGreen }}>active</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Parameters() {
  const { T } = useTheme();
  const { orgs, orgId } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');

  const orgRole = orgs.find(o => o.id === orgId)?.role ?? 'USER';

  const [apps, setApps] = useState([]);
  const [tree, setTree] = useState([]);
  const [parameters, setParameters] = useState([]);
  const parametersRef = useRef([]);
  useEffect(() => { parametersRef.current = parameters; }, [parameters]);
  const loadVersionRef = useRef(0);

  const [currentApp, setCurrentApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [hoveredEyeId, setHoveredEyeId] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSecret, setNewSecret] = useState(false);
  const [creating, setCreating] = useState(false);

  // Environment selector
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState(null);
  const [paramValues, setParamValues] = useState({}); // { [parameterId]: value }
  const [revealedIds, setRevealedIds] = useState(new Set());

  useEffect(() => {
    setApps([]);
    setTree([]);
    setParameters([]);
    setCurrentApp(null);
    setParamValues({});
    setEnvironments([]);
    setSelectedEnvId(null);
    setRevealedIds(new Set());
    setLoading(true);

    Promise.all([apiService.getEnvironments(), apiService.getProjects(), new Promise(r => setTimeout(r, 500))])
      .then(async ([envs, data]) => {
        setEnvironments(envs);
        if (envs.length > 0) setSelectedEnvId(envs[0].id);
        setApps(data);
        setTree(buildAppTree(data));
        const target = selectedProjectId
          ? data.find(p => p.id === selectedProjectId)
          : data[0];
        if (target) {
          setCurrentApp(target);
          const resolved = await apiService.getResolvedParameters(target.id);
          setParameters(resolved);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId, selectedProjectId]);

  const loadParamValues = useCallback(async (appId, envId, resolvedParams) => {
    if (!appId || !envId) return;
    const version = ++loadVersionRef.current;
    const params = resolvedParams ?? parametersRef.current;
    const sourceAppIds = [...new Set([appId, ...params.filter(p => !p.isOwn).map(p => p.appId)])];
    try {
      const results = await Promise.all(
        sourceAppIds.map(id => apiService.getParameterValues(id).catch(() => null))
      );
      if (version !== loadVersionRef.current) return;
      const map = {};
      for (const grouped of results) {
        if (!grouped) continue;
        const envGroup = Object.values(grouped).find(g => g.environmentId === envId);
        if (envGroup) for (const v of envGroup.values) map[v.parameterId] = v.value;
      }
      setParamValues(map);
    } catch {
      if (version !== loadVersionRef.current) return;
      setParamValues({});
    }
  }, []);

  useEffect(() => {
    setRevealedIds(new Set());
    loadParamValues(currentApp?.id, selectedEnvId);
  }, [currentApp?.id, selectedEnvId, loadParamValues]);

  const selectApp = async (node) => {
    if (currentApp?.id === node.id) return;
    setCurrentApp(node);
    setParamsLoading(true);
    setParamValues({});
    setRevealedIds(new Set());
    try {
      const [resolved] = await Promise.all([
        apiService.getResolvedParameters(node.id),
        new Promise(r => setTimeout(r, 300)),
      ]);
      setParameters(resolved);
      await loadParamValues(node.id, selectedEnvId, resolved);
    } catch (e) { console.error(e); } finally { setParamsLoading(false); }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !currentApp) return;
    setCreating(true);
    try {
      const payload = { key: newKey.trim(), appId: currentApp.id };
      if (newDesc.trim()) payload.description = newDesc.trim();
      if (newSecret) payload.isSecret = true;
      const created = await apiService.createParameter(payload);
      setParameters(prev => [...prev, { ...created, appName: currentApp.name, isOwn: true }]);
      setShowModal(false);
      setNewKey('');
      setNewDesc('');
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  const toggleReveal = (paramId) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(paramId)) next.delete(paramId);
      else next.add(paramId);
      return next;
    });
  };

  const filtered = parameters.filter(p => (p.key ?? '').toLowerCase().includes(search.toLowerCase()));

  const envIsSecret = environments.find(e => e.id === selectedEnvId)?.isSecret ?? false;
  const valuesBlocked = envIsSecret;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
            // parameters
          </div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em' }}>
            Parameters
          </h1>
        </div>
        {(loading || currentApp) && (
          <Btn T={T} variant="primary" onClick={() => setShowModal(true)} disabled={loading}>+ new parameter</Btn>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* App sidebar */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px 8px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.12em' }}>//</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>apps</span>
            {apps.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontFamily: FONTS.mono, fontSize: '9px', color: T.termGreen,
                background: T.termGreenBg, border: `1px solid ${T.termGreenBorder}`,
                padding: '1px 6px', borderRadius: '2px',
              }}>
                {apps.length}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ height: '36px', background: T.overlay, borderRadius: '4px', animation: 'pulse 1.4s infinite' }} />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted }}>no apps yet</p>
            </div>
          ) : (
            <AppTreeA nodes={tree} T={T} onSelect={selectApp} selectedId={currentApp?.id} />
          )}
        </div>

        {/* Parameters panel */}
        <div>
          {!loading && !currentApp ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '32px', color: T.textMuted, marginBottom: '12px' }}>◈</div>
              <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary }}>
                Select an app to view its parameters
              </p>
            </div>
          ) : (
            <>
              {/* Search + env selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: '0 0 520px' }}>
                  <FormInput
                    placeholder="search parameters…"
                    prefix="/"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {environments.length > 0 ? (
                  <EnvDropdown
                    environments={environments}
                    selectedEnvId={selectedEnvId}
                    onSelect={setSelectedEnvId}
                    T={T}
                  />
                ) : (
                  <div style={{
                    height: '36px', width: '140px',
                    background: T.overlay, borderRadius: '4px',
                    border: `1px solid ${T.border}`,
                    animation: 'pulse 1.4s infinite',
                  }} />
                )}
              </div>

              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 160px 120px',
                padding: '6px 14px', borderBottom: `1px solid ${T.border}`,
                fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                <span>key</span>
                <span>value</span>
                <span>inherited from</span>
                <span></span>
              </div>

              {loading || paramsLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 160px 160px 120px',
                    alignItems: 'center', padding: '9px 14px', minHeight: '40px',  
                    borderBottom: `1px solid ${T.border}`, gap: '8px',
                  }}>
                    <div style={{ height: '14px', width: `${45 + (i * 13) % 35}%`, background: T.overlay, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '70%', background: T.overlay, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '40%', background: T.overlay, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '50%', background: T.overlay, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, marginBottom: '14px' }}>
                    {search ? `no parameters match "${search}"` : `no parameters in ${currentApp.name}`}
                  </p>
                  {!search && (
                    <Btn T={T} variant="primary" size="sm" onClick={() => setShowModal(true)}>
                      create first parameter
                    </Btn>
                  )}
                </div>
              ) : filtered.map(param => {
                const value = paramValues[param.id];
                const hasValue = value !== undefined && value !== '';
                const isEmpty = value === '';
                const isRevealed = revealedIds.has(param.id);
                const canReveal = !valuesBlocked && hasValue;

                return (
                  <div key={param.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 160px 160px 120px',
                    alignItems: 'center', padding: '9px 14px',
                    borderBottom: `1px solid ${T.border}`,
                    fontFamily: FONTS.mono, fontSize: '12px',
                    opacity: param.isOwn ? 1 : 0.85,
                  }}>
                    {/* Key */}
                    <span style={{ color: T.textPrimary }}>{param.key}</span>

                    {/* Value */}
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px' }}>
                      {isEmpty ? (
                        <span style={{ color: T.amber }}>(empty)</span>
                      ) : value === undefined ? (
                        <span style={{ color: T.textMuted }}>—</span>
                      ) : isRevealed ? (
                        <span style={{
                          color: T.textPrimary,
                          maxWidth: '140px', display: 'inline-block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {value}
                        </span>
                      ) : (
                        <span style={{ color: T.textMuted, letterSpacing: '0.15em' }}>••••••</span>
                      )}
                    </span>

                    {/* Inherited from */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {!param.isOwn ? (
                        <span style={{
                          fontFamily: FONTS.mono, fontSize: '10px', color: T.amber,
                          background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                          padding: '1px 7px', borderRadius: '2px',
                        }}>
                          {param.appName}
                        </span>
                      ) : param.isOverride ? (
                        <>
                          <span style={{
                            fontFamily: FONTS.mono, fontSize: '9px', color: T.blue,
                            background: `${T.blue}18`, border: `1px solid ${T.blue}40`,
                            padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.05em',
                          }}>
                            OVERRIDE
                          </span>
                          <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>
                            {param.overriddenFromAppName}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: T.textMuted, fontSize: '11px' }}>—</span>
                      )}
                    </span>

                    {/* Actions: eye + view */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(() => {
                        const tooltipText =
                          envIsSecret          ? 'This is a secret parameter' :
                          !param.isOwn         ? 'inherited' :
                          !hasValue && !isEmpty ? 'no value' :
                          isRevealed           ? 'hide value' : 'reveal value';
                        return (
                          <div style={{ position: 'relative', display: 'inline-flex' }}>
                            {hoveredEyeId === param.id && (
                              <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 7px)',
                                left: '50%', transform: 'translateX(-50%)',
                                background: T.elevated,
                                border: `1px solid ${T.border}`,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontFamily: FONTS.mono, fontSize: '10px', color: T.textSecondary,
                                whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                              }}>
                                {tooltipText}
                                <div style={{
                                  position: 'absolute',
                                  top: '100%', left: '50%', transform: 'translateX(-50%)',
                                  width: 0, height: 0,
                                  borderLeft: '5px solid transparent',
                                  borderRight: '5px solid transparent',
                                  borderTop: `5px solid ${T.border}`,
                                }} />
                              </div>
                            )}
                            <button
                              onClick={() => (canReveal || isRevealed) && toggleReveal(param.id)}
                              onMouseEnter={() => setHoveredEyeId(param.id)}
                              onMouseLeave={() => setHoveredEyeId(null)}
                              style={{
                                background: hoveredEyeId === param.id ? T.overlay : 'transparent',
                                border: `1px solid ${hoveredEyeId === param.id ? T.border : 'transparent'}`,
                                borderRadius: '4px', padding: '4px',
                                cursor: (canReveal || isRevealed) ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center',
                                opacity: (valuesBlocked || isRevealed || canReveal) ? 1 : 0.25,
                                transition: 'background 0.12s, border-color 0.12s',
                              }}
                            >
                              {valuesBlocked ? (
                                <EyeOff size={14} color={T.textMuted} strokeWidth={1.5} />
                              ) : isRevealed ? (
                                <EyeOff size={14} color={T.amber} strokeWidth={1.5} />
                              ) : (
                                <Eye size={14} color={T.textMuted} strokeWidth={1.5} />
                              )}
                            </button>
                          </div>
                        );
                      })()}

                      <Link
                        to={
                          `/dashboard/parameters/${param.id}` +
                          `?appId=${currentApp.id}` +
                          `&sourceAppId=${param.appId}` +
                          `&sourceAppName=${encodeURIComponent(param.appName)}` +
                          `&currentAppName=${encodeURIComponent(currentApp.name)}` +
                          `&key=${encodeURIComponent(param.key)}` +
                          `&own=${param.isOwn ? '1' : '0'}` +
                          `&isOverride=${param.isOverride ? '1' : '0'}` +
                          `&overrideFromAppName=${encodeURIComponent(param.overriddenFromAppName ?? '')}` +
                          `&overrideSourceAppId=${encodeURIComponent(param.overrideSourceAppId ?? '')}` +
                          `&overrideSourceParamId=${encodeURIComponent(param.overrideSourceParamId ?? '')}`
                        }
                        style={{ textDecoration: 'none' }}
                      >
                        <Btn T={T} variant="secondary" size="sm">view</Btn>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNewKey(''); setNewDesc(''); setNewSecret(false); }}
        title={`new parameter · ${currentApp?.name ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Key"
            placeholder="DATABASE_URL"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <FormInput
            label="Description"
            placeholder="Primary database connection string"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />

          {/* Secret toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px',
            background: newSecret ? `${T.amber}10` : T.overlay,
            border: `1px solid ${newSecret ? `${T.amber}40` : T.border}`,
            borderRadius: '4px',
          }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: newSecret ? T.amber : T.textMuted }}>
                secret parameter
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                {newSecret ? 'value always masked in list view' : 'value visible in list view'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewSecret(v => !v)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: newSecret ? T.amber : T.border,
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: newSecret ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: T.bg, transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewKey(''); setNewDesc(''); setNewSecret(false); }}>
              cancel
            </Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!newKey.trim() || creating}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
