import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, Btn, FONTS, AppTreeA, buildAppTree } from '@mull/ui';
import { Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import TrashButton from '../components/ui/TrashButton';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';

export default function Apps() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [apps, setApps] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null); // { ownCount, inheritedCount, overrideCount }
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Hover state for export icon button
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Modal form
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    apiService.getProjects()
      .then(data => {
        setApps(data);
        setTree(buildAppTree(data));
        if (data.length > 0) handleSelectApp(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => { resetForm(); setShowModal(true); };
    window.addEventListener('mull:new', handler);
    return () => window.removeEventListener('mull:new', handler);
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormParentId('');
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const payload = { name: formName.trim() };
      if (formParentId) payload.parentId = formParentId;
      const created = await apiService.createProject(payload);
      const next = [...apps, created];
      setApps(next);
      setTree(buildAppTree(next));
      setShowModal(false);
      resetForm();
      toast('app created', 'success', created.name);
    } catch (e) {
      const message = e.response?.data?.message || e.message || 'Failed to create app';
      setCreateError(message);
      toast('app creation failed', 'error', message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (node) => {
    navigate(`/dashboard/parameters?project=${node.id}`);
  };

  const handleSelectApp = async (node) => {
    if (selectedApp?.id === node.id) {
      setSelectedApp(null);
      setDetail(null);
      return;
    }
    setSelectedApp(node);
    setDetail(null);
    setDetailLoading(true);
    try {
      const resolved = await apiService.getResolvedParameters(node.id);
      setDetail({
        ownCount: resolved.summary?.local ?? 0,
        inheritedCount: resolved.summary?.inherited ?? 0,
        overrideCount: resolved.summary?.overrides ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiService.deleteProject(selectedApp.id);
      const next = apps.filter(a => a.id !== selectedApp.id);
      setApps(next);
      setTree(buildAppTree(next));
      setSelectedApp(null);
      setDetail(null);
      setShowDeleteModal(false);
      toast('app deleted');
    } catch (e) {
      const message = e.response?.data?.message || e.message || 'Failed to delete app';
      setDeleteError(message);
      toast('delete failed', 'error', message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedApp || exporting) return;

    setExporting(true);
    try {
      const { parameters: resolved, values } = await apiService.exportProjectParameters(selectedApp.id);
      const valuesByParameterKey = new Map();

      for (const [envName, group] of Object.entries(values ?? {})) {
        for (const row of group.values ?? []) {
          if (!valuesByParameterKey.has(row.parameterKey)) {
            valuesByParameterKey.set(row.parameterKey, {});
          }
          valuesByParameterKey.get(row.parameterKey)[envName] = row.value;
        }
      }

      const exported = {
        app: { id: selectedApp.id, name: selectedApp.name },
        exportedAt: new Date().toISOString(),
        parameters: (resolved.items ?? []).map(item => ({
          key: item.key,
          description: item.parameter?.description ?? null,
          values: valuesByParameterKey.get(item.key) ?? {},
        })),
      };

      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = selectedApp.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'app';
      link.href = url;
      link.download = `${safeName}-parameters.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('parameters exported');
    } catch (e) {
      console.error(e);
      toast('export failed', 'error', e.response?.data?.message || e.message || 'Could not export parameters');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
            // apps
          </div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Apps
          </h1>
          <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary }}>
            Hierarchical config inheritance across your services.
          </p>
        </div>
        <Btn T={T} variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>
          + new app
        </Btn>
      </div>

      {/* Tree + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 300px' : '1fr', gap: '16px', alignItems: 'start' }}>
        {/* Tree */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  height: '46px', background: T.surface,
                  border: `1px solid ${T.border}`, borderRadius: '5px',
                  animation: 'pulse 1.4s infinite',
                }} />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textSecondary, marginBottom: '8px' }}>
                <span style={{ color: T.termGreen }}>❯</span> no apps yet<span className="term-cursor" style={{ color: T.textSecondary }} />
              </p>
              <p style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginBottom: '20px' }}>
                create your first app to start organizing config inheritance
              </p>
              <Btn T={T} variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>
                + new app
              </Btn>
            </div>
          ) : (
            <AppTreeA
              nodes={tree}
              T={T}
              onEdit={handleEdit}
              onSelect={handleSelectApp}
              selectedId={selectedApp?.id}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedApp && (
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: '6px',
            position: 'sticky',
            top: '16px',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '12px 16px 10px',
              borderBottom: `1px solid ${T.border}`,
              borderRadius: '6px 6px 0 0',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.12em' }}>//</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>app detail</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Export — TODO */}
                <div style={{ position: 'relative' }}>
                  {hoveredIcon === 'export' && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                      background: T.elevated, border: `1px solid ${T.border}`, borderRadius: '4px',
                      padding: '3px 8px', fontFamily: FONTS.mono, fontSize: '10px', color: T.textSecondary,
                      whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                    }}>
                      export JSON
                      <div style={{
                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                        borderTop: `5px solid ${T.border}`,
                      }} />
                    </div>
                  )}
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    onMouseEnter={() => setHoveredIcon('export')}
                    onMouseLeave={() => setHoveredIcon(null)}
                    style={{
                      background: hoveredIcon === 'export' ? T.overlay : 'transparent',
                      border: `1px solid ${hoveredIcon === 'export' ? T.border : 'transparent'}`,
                      borderRadius: '4px', cursor: exporting ? 'wait' : 'pointer',
                      padding: '4px', display: 'flex', alignItems: 'center',
                      opacity: exporting ? 0.55 : 1,
                      transition: 'all 0.12s',
                    }}
                  >
                    <Download size={13} color={T.textMuted} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Delete */}
                <TrashButton
                  T={T}
                  label="delete app"
                  onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
                />
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              {/* App name */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: '14px', color: T.textPrimary, marginBottom: '4px' }}>
                  {selectedApp.name}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted }}>
                  depth {selectedApp.depth ?? 0}
                  {selectedApp.parentId && (
                    <span style={{ marginLeft: '8px' }}>
                      · child of {apps.find(a => a.id === selectedApp.parentId)?.name ?? '…'}
                    </span>
                  )}
                </div>
              </div>

              {/* Parameter counts */}
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ height: '28px', background: T.elevated, borderRadius: '3px', animation: 'pulse 1.4s infinite' }} />
                  ))}
                </div>
              ) : detail && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    {[
                      { label: 'own', value: detail.ownCount, color: T.termGreen },
                      { label: 'inherited', value: detail.inheritedCount, color: T.amber },
                      { label: 'overrides', value: detail.overrideCount, color: T.blue },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px',
                        background: T.overlay,
                        borderRadius: '4px',
                        border: `1px solid ${T.border}`,
                      }}>
                        <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, letterSpacing: '0.08em' }}>
                          {label}
                        </span>
                        <span style={{
                          fontFamily: FONTS.mono, fontSize: '12px', fontWeight: 700, color,
                        }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                </>
              )}

              {/* Actions */}
              <Btn
                T={T}
                variant="primary"
                size="sm"
                onClick={() => navigate(`/dashboard/parameters?project=${selectedApp.id}`)}
                style={{ width: '100%' }}
              >
                view parameters →
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="new app"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Name"
            placeholder="acme-api"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            autoFocus
          />

          <FormInput
            label="Description"
            placeholder="Main API service for Acme Corp"
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
          />

          <div>
            <div style={{
              fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
            }}>
              Parent app
            </div>
            <select
              value={formParentId}
              onChange={e => setFormParentId(e.target.value)}
              disabled={apps.length === 0}
              style={{
                width: '100%', padding: '8px 12px',
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: '4px', outline: 'none',
                fontFamily: FONTS.mono, fontSize: '12px',
                color: apps.length === 0 ? T.textDisabled : T.textPrimary,
                cursor: apps.length === 0 ? 'not-allowed' : 'pointer',
                appearance: 'none',
              }}
            >
              <option value="">None</option>
              {apps
                .slice()
                .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.name.localeCompare(b.name))
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {'—'.repeat(a.depth ?? 0)} {a.name}
                  </option>
                ))}
            </select>
            {apps.length === 0 && (
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted, marginTop: '5px' }}>
                No other apps available yet
              </div>
            )}
          </div>

          {createError && (
            <div style={{
              padding: '8px 12px',
              background: T.redBg, border: `1px solid ${T.redBorder}`,
              borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
              fontFamily: FONTS.mono, fontSize: '11px', color: T.red,
            }}>
              {createError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); resetForm(); }}>
              cancel
            </Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!formName.trim() || creating}>
              {creating ? 'creating…' : 'create app'}
            </Btn>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteError(null); }}
        entityName={selectedApp?.name ?? ''}
        warningText={
          <>This will permanently delete <strong style={{ color: T.textPrimary }}>{selectedApp?.name}</strong> and all its parameters and values. This action cannot be undone.</>
        }
        onDelete={handleDelete}
        deleting={deleting}
        error={deleteError}
        deleteLabel="delete app"
      />
    </div>
  );
}
