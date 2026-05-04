import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, Btn, FONTS, AppTreeA, buildAppTree } from '@mull/ui';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

export default function Apps() {
  const { T } = useTheme();
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
    } catch (e) {
      setCreateError(e.response?.data?.message || e.message || 'Failed to create app');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (node) => {
    // navigate to parameters for that app
    navigate(`/dashboard/parameters?project=${node.id}`);
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

      {/* Tree */}
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
          <div style={{ fontFamily: FONTS.mono, fontSize: '32px', color: T.textMuted, marginBottom: '12px' }}>◈</div>
          <p style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textSecondary, marginBottom: '16px' }}>
            No apps yet. Create your first app to get started.
          </p>
          <Btn T={T} variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>
            create first app
          </Btn>
        </div>
      ) : (
        <AppTreeA
          nodes={tree}
          T={T}
          onEdit={handleEdit}
        />
      )}

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
    </div>
  );
}
