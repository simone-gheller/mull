import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
import { useTheme, Btn, FONTS, AppTreeA, buildAppTree } from '@vextis/ui';
import { Layers, ChevronsUpDown, Eye, EyeOff, Shield, CornerDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
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
              {env.protected && (
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
  const { toast } = useToast();
  const orgSlug = slugify(orgs.find(o => o.id === orgId)?.name ?? orgId ?? '');
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');

  const [apps, setApps] = useState([]);
  const [tree, setTree] = useState([]);
  const [parameters, setParameters] = useState([]);
  const loadVersionRef = useRef(0);
  const isUserEnvSwitch = useRef(false);
  const [envSwitching, setEnvSwitching] = useState(false);

  const [currentApp, setCurrentApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [hoveredEyeId, setHoveredEyeId] = useState(null);
  const [hoveredLockId, setHoveredLockId] = useState(null);
  const [hoveredOverrideId, setHoveredOverrideId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDefault, setNewDefault] = useState('');
  const [creating, setCreating] = useState(false);

  // Environment selector
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());

  useEffect(() => {
    setApps([]);
    setTree([]);
    setParameters([]);
    setCurrentApp(null);
    setEnvironments([]);
    setSelectedEnvId(null);
    setRevealedIds(new Set());
    setLoading(true);

    Promise.all([apiService.getEnvironments(), apiService.getProjects(), new Promise(r => setTimeout(r, 500))])
      .then(async ([envs, data]) => {
        setEnvironments(envs);
        const activeEnvId = envs[0]?.id ?? null;
        if (activeEnvId) setSelectedEnvId(activeEnvId);
        setApps(data);
        setTree(buildAppTree(data));
        const target = selectedProjectId
          ? data.find(p => p.id === selectedProjectId)
          : data[0];
        if (target) {
          setCurrentApp(target);
          const resolved = await apiService.getResolvedParameters(target.id, activeEnvId);
          setParameters(resolved.items ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId, selectedProjectId]);

  useEffect(() => {
    if (!currentApp?.id || !selectedEnvId) return;
    setRevealedIds(new Set());
    const version = ++loadVersionRef.current;
    const showSkeleton = isUserEnvSwitch.current;
    isUserEnvSwitch.current = false;
    if (showSkeleton) setEnvSwitching(true);
    Promise.all([
      apiService.getResolvedParameters(currentApp.id, selectedEnvId)
        .then(resolved => {
          if (version === loadVersionRef.current) setParameters(resolved.items ?? []);
        }),
      showSkeleton ? new Promise(r => setTimeout(r, 400)) : Promise.resolve(),
    ]).then(() => { if (showSkeleton) setEnvSwitching(false); });
  }, [currentApp?.id, selectedEnvId]);

  useEffect(() => {
    const handler = () => { if (currentApp) setShowModal(true); };
    window.addEventListener('vextis:new', handler);
    return () => window.removeEventListener('vextis:new', handler);
  }, [currentApp]);

  const selectApp = async (node) => {
    if (currentApp?.id === node.id) return;
    setCurrentApp(node);
    setParamsLoading(true);
    setRevealedIds(new Set());
    try {
      const [resolved] = await Promise.all([
        apiService.getResolvedParameters(node.id, selectedEnvId),
        new Promise(r => setTimeout(r, 300)),
      ]);
      setParameters(resolved.items ?? []);
    } catch (e) { console.error(e); } finally { setParamsLoading(false); }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !currentApp) return;
    setCreating(true);
    try {
      const payload = { key: newKey.trim(), appId: currentApp.id };
      if (newDesc.trim()) payload.description = newDesc.trim();
      const created = await apiService.createParameter(payload);

      if (newDefault.trim()) {
        const allValues = await apiService.getParameterValues(currentApp.id);
        await Promise.all(
          Object.values(allValues).flatMap(env =>
            env.values
              .filter(v => v.parameterId === created.id)
              .map(v => apiService.updateParameterValue(v.id, { value: newDefault.trim() }))
          )
        );
      }

      const resolved = await apiService.getResolvedParameters(currentApp.id, selectedEnvId);
      setParameters(resolved.items ?? []);
      toast('parameter created', 'success', created.key);
      setShowModal(false);
      setNewKey(''); setNewDesc(''); setNewDefault('');
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  const handleEnvSelect = (envId) => {
    if (envId === selectedEnvId) return;
    isUserEnvSwitch.current = true;
    setSelectedEnvId(envId);
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
                <div key={i} style={{ height: '36px', background: T.elevated, borderRadius: '4px', animation: 'pulse 1.4s infinite' }} />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textSecondary }}>
                <span style={{ color: T.termGreen }}>❯</span> no apps yet<span className="term-cursor" style={{ color: T.textSecondary }} />
              </p>
            </div>
          ) : (
            <AppTreeA nodes={tree} T={T} onSelect={selectApp} selectedId={currentApp?.id} />
          )}
        </div>

        {/* Parameters panel */}
        <div>
          {!loading && !currentApp ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textSecondary }}>
                <span style={{ color: T.termGreen }}>❯</span> select an app from the tree to view parameters<span className="term-cursor" style={{ color: T.textSecondary }} />
              </p>
            </div>
          ) : (
            <>
              {/* Env selector + search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {environments.length > 0 ? (
                  <EnvDropdown
                    environments={environments}
                    selectedEnvId={selectedEnvId}
                    onSelect={handleEnvSelect}
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

                <div style={{ flex: 1 }}>
                  <FormInput
                    data-search
                    placeholder="search parameters…"
                    prefix="/"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Table header + rows — aria-live announces env changes to screen readers */}
              <div aria-live="polite" aria-label="parameter values">
              <div style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 100px 144px', columnGap: '24px',
                padding: '6px 14px', borderBottom: `1px solid ${T.border}`,
                fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                <span>key</span>
                <span>value</span>
                <span>inherited from</span>
                <span></span>
              </div>

              {loading || paramsLoading || envSwitching ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 100px 144px', columnGap: '24px',
                    alignItems: 'center', padding: '9px 14px', minHeight: '40px',  
                    borderBottom: `1px solid ${T.border}`, gap: '8px',
                  }}>
                    <div style={{ height: '14px', width: `${45 + (i * 13) % 35}%`, background: T.elevated, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '70%', background: T.elevated, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '40%', background: T.elevated, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                    <div style={{ height: '14px', width: '50%', background: T.elevated, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
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
                const valueInfo = param.value;
                const rowId = param.parameter.id;
                const value = valueInfo?.value;
                const hasValue = ['set', 'inherited'].includes(valueInfo?.state) && value !== null && value !== undefined;
                const isUnset = !valueInfo || valueInfo.state === 'unset';
                const isRedacted = valueInfo?.state === 'redacted';
                const isRevealed = revealedIds.has(rowId);
                const isProtectedEnv = environments.find(e => e.id === selectedEnvId)?.protected ?? false;
                const canReveal = !!valueInfo?.canRead && hasValue;
                const sourceName = valueInfo?.state === 'inherited'
                  ? valueInfo.sourceAppName
                  : param.relationship === 'inherited'
                    ? param.parameter.appName
                    : null;
                const parentName = sourceName ?? (param.relationship === 'override' ? param.overridden?.appName : null);
                const hasParent = !!parentName;

                return (
                  <div key={rowId}
                    onMouseEnter={() => setHoveredRowId(rowId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{
                    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 100px 144px', columnGap: '24px',
                    alignItems: 'center', padding: '9px 14px',
                    borderBottom: `1px solid ${T.border}`,
                    background: hoveredRowId === rowId ? T.overlay : 'transparent',
                    transition: 'background 0.1s',
                    fontFamily: FONTS.mono, fontSize: '12px',
                    opacity: param.relationship === 'inherited' ? 0.85 : 1,
                  }}>
                    {/* Key */}
                    <span className="scroll-x-hidden" style={{ color: T.textPrimary, display: 'block', whiteSpace: 'nowrap', minWidth: 0 }}>{param.key}</span>

                    {/* Value */}
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px' }}>
                      {isRedacted ? (
                        <span style={{ color: T.amber, fontStyle: 'italic' }}>restricted</span>
                      ) : isUnset ? (
                        <span style={{ color: T.textMuted, fontStyle: 'italic' }}>unset</span>
                      ) : isRevealed ? (
                        <span style={{
                          color: T.textSecondary, display: 'block',
                          wordBreak: 'break-all', overflowWrap: 'anywhere',
                        }}>
                          {value}
                        </span>
                      ) : (
                        <span style={{ color: T.textMuted, letterSpacing: '0.15em' }}>••••••••••••</span>
                      )}
                    </span>

                    {/* Inherited from */}
                    <span style={{ fontFamily: FONTS.mono, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                      color: hasParent ? T.textSecondary : T.textMuted,
                    }}>
                      {parentName ?? '—'}
                    </span>

                            {/* Actions: eye + view */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {(() => {
                                const isInteractive = canReveal || isRevealed;
                                // No tooltip on the eye when secret: the lock already carries that meaning.
                                const tooltipText =
                                  isProtectedEnv ? null :
                                  valueInfo?.state === 'inherited' ? 'inherited' :
                                  !hasValue && !isUnset ? 'no value' :
                                  isRevealed ? 'hide value' : 'reveal value';
                                const eyeAriaLabel =
                                  isRevealed ? 'Hide value' :
                                  canReveal ? 'Reveal value' :
                                  isProtectedEnv ? 'Value hidden in protected environment' :
                                  'No value set';
                                return (
                                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                                    {hoveredEyeId === rowId && tooltipText && (
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
                                      aria-label={eyeAriaLabel}
                                      aria-disabled={!isInteractive ? 'true' : undefined}
                                      onClick={() => isInteractive && toggleReveal(rowId)}
                                      onMouseEnter={() => setHoveredEyeId(rowId)}
                                      onMouseLeave={() => setHoveredEyeId(null)}
                                      style={{
                                        background: hoveredEyeId === rowId ? T.overlay : 'transparent',
                                        border: `1px solid ${hoveredEyeId === rowId ? T.border : 'transparent'}`,
                                        borderRadius: '4px', padding: '4px',
                                        cursor: isInteractive ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center',
                                        opacity: isInteractive ? 1 : 0.35,
                                        transition: 'background 0.12s, border-color 0.12s',
                                      }}
                                    >
                                      {isProtectedEnv && !isRevealed ? (
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

                              <div
                                style={{ position: 'relative', display: 'inline-flex' }}
                                onMouseEnter={() => setHoveredLockId(rowId)}
                                onMouseLeave={() => setHoveredLockId(null)}
                              >
                                {hoveredLockId === rowId && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 7px)',
                                    left: '50%', transform: 'translateX(-50%)',
                                    background: T.elevated, border: `1px solid ${T.border}`,
                                    borderRadius: '4px', padding: '3px 8px',
                                    fontFamily: FONTS.mono, fontSize: '10px', color: T.textSecondary,
                                    whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                                  }}>
                                    {isProtectedEnv ? 'Protected environment' : 'Not protected'}
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
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '3px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isProtectedEnv ? T.amberBorder : T.border}`,
                                  background: isProtectedEnv ? T.amberBg : 'transparent',
                                }}>
                                  <Shield size={11} strokeWidth={1.5} color={isProtectedEnv ? T.amber : T.textMuted} />
                                </span>
                              </div>

                              <div
                                style={{ position: 'relative', display: 'inline-flex' }}
                                onMouseEnter={() => setHoveredOverrideId(rowId)}
                                onMouseLeave={() => setHoveredOverrideId(null)}
                              >
                                {hoveredOverrideId === rowId && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 7px)',
                                    left: '50%', transform: 'translateX(-50%)',
                                    background: T.elevated, border: `1px solid ${T.border}`,
                                    borderRadius: '4px', padding: '3px 8px',
                                    fontFamily: FONTS.mono, fontSize: '10px', color: T.textSecondary,
                                    whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                                  }}>
                                    {param.relationship === 'override' ? 'Override' : hasParent ? 'Inherited' : 'Own value'}
                                    <div style={{
                                      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                                      width: 0, height: 0,
                                      borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                                      borderTop: `5px solid ${T.border}`,
                                    }} />
                                  </div>
                                )}
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '3px',
                                  borderRadius: '4px',
                                  border: `1px solid ${param.relationship === 'override' ? T.blueBorder : T.border}`,
                                  background: param.relationship === 'override' ? T.blueBg : 'transparent',
                                }}>
                                  <CornerDownRight size={11} strokeWidth={1.5} color={param.relationship === 'override' ? T.blue : T.textMuted} />
                                </span>
                              </div>

                              <Link
                                to={`/dashboard/${orgSlug}/${slugify(currentApp.name)}/parameters/${encodeURIComponent(param.key)}`}
                                style={{ textDecoration: 'none' }}
                              >
                        <Btn T={T} variant="secondary" size="sm">view</Btn>
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNewKey(''); setNewDesc(''); setNewDefault(''); }}
        title={`new parameter · ${currentApp?.name ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Key"
            placeholder="DATABASE_URL"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            maxLength={100}
            autoFocus
          />
          <FormInput
            label="Description"
            placeholder="Primary database connection string"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <FormInput
            label="Default value (optional)"
            placeholder="applied to all environments"
            value={newDefault}
            onChange={e => setNewDefault(e.target.value)}
            type="password"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewKey(''); setNewDesc(''); setNewDefault(''); }}>
              cancel
            </Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!newKey.trim() || creating} style={{ background: T.termGreenBg, color: T.termGreen, border: `1px solid ${T.termGreenBorder}` }}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
