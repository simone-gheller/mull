import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme, Btn, Badge, FONTS, AppTreeA, buildAppTree } from '@mull/ui';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

export default function Parameters() {
  const { T } = useTheme();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');

  const [apps, setApps] = useState([]);
  const [tree, setTree] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [currentApp, setCurrentApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiService.getProjects().then(async data => {
      setApps(data);
      setTree(buildAppTree(data));
      // Select by URL param, or fall back to the first app (ordered by depth then name)
      const target = selectedProjectId
        ? data.find(p => p.id === selectedProjectId)
        : data[0];
      if (target) {
        setCurrentApp(target);
        const resolved = await apiService.getResolvedParameters(target.id);
        setParameters(resolved);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedProjectId]);

  const selectApp = async (node) => {
    if (currentApp?.id === node.id) return;
    setCurrentApp(node);
    setParamsLoading(true);
    try {
      const resolved = await apiService.getResolvedParameters(node.id);
      setParameters(resolved);
    } catch (e) { console.error(e); } finally { setParamsLoading(false); }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !currentApp) return;
    setCreating(true);
    try {
      const payload = { key: newKey.trim(), appId: currentApp.id };
      if (newDesc.trim()) payload.description = newDesc.trim();
      const created = await apiService.createParameter(payload);
      setParameters(prev => [...prev, { ...created, appName: currentApp.name, isOwn: true }]);
      setShowModal(false);
      setNewKey('');
      setNewDesc('');
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  const filtered = parameters.filter(p => (p.key ?? '').toLowerCase().includes(search.toLowerCase()));
  const inheritedCount = filtered.filter(p => !p.isOwn).length;

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
        {currentApp && (
          <Btn T={T} variant="primary" onClick={() => setShowModal(true)}>+ new parameter</Btn>
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
          {!currentApp ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: '32px', color: T.textMuted, marginBottom: '12px' }}>◈</div>
              <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary }}>
                Select an app to view its parameters
              </p>
            </div>
          ) : (
            <>
              {/* Search + context */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <FormInput
                    placeholder="search parameters…"
                    prefix="/"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Badge T={T} variant="info">{currentApp.name}</Badge>
                {inheritedCount > 0 && (
                  <span style={{
                    fontFamily: FONTS.mono, fontSize: '10px', color: T.amber,
                    background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                    padding: '2px 8px', borderRadius: '3px', whiteSpace: 'nowrap',
                  }}>
                    {inheritedCount} inherited
                  </span>
                )}
              </div>

              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 200px 160px 80px',
                padding: '6px 14px', borderBottom: `1px solid ${T.border}`,
                fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                <span>key</span>
                <span>description</span>
                <span>inherited from</span>
                <span></span>
              </div>

              {paramsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height: '44px', background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: '4px', margin: '4px 0', animation: 'pulse 1.4s infinite',
                  }} />
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
              ) : filtered.map(param => (
                <div key={param.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 200px 160px 80px',
                  alignItems: 'center', padding: '9px 14px',
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: FONTS.mono, fontSize: '12px',
                  opacity: param.isOwn ? 1 : 0.85,
                }}>
                  <span style={{ color: T.textPrimary }}>{param.key}</span>

                  <span style={{
                    color: T.textMuted, fontSize: '11px', fontFamily: FONTS.display,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {param.description || '—'}
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {!param.isOwn ? (
                      // Inherited: show source app name
                      <span style={{
                        fontFamily: FONTS.mono, fontSize: '10px', color: T.amber,
                        background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                        padding: '1px 7px', borderRadius: '2px',
                      }}>
                        {param.appName}
                      </span>
                    ) : param.isOverride ? (
                      // Override: own param that shadows an ancestor
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
              ))}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNewKey(''); setNewDesc(''); }}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewKey(''); setNewDesc(''); }}>
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
