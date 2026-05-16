import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useTheme, Btn, FONTS } from '@vextis/ui';
import apiService from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import TrashButton from '../components/ui/TrashButton';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';

export default function Environments() {
  const { T } = useTheme();
  const { toast } = useToast();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('CUSTOM');
  const [newProtected, setNewProtected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [confirmEnv, setConfirmEnv] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiService.getEnvironments()
      .then(data => setEnvironments(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('vextis:new', handler);
    return () => window.removeEventListener('vextis:new', handler);
  }, []);

  const handleDelete = async () => {
    if (!confirmEnv) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiService.deleteEnvironment(confirmEnv.id);
      setEnvironments(envs => envs.filter(e => e.id !== confirmEnv.id));
      setConfirmEnv(null);
      toast('environment deleted');
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to delete environment';
      setDeleteError(message);
      toast('delete failed', 'error', message);
    } finally { setDeleting(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const payload = { name: newName.trim(), tier: newTier, protected: newProtected };
      const created = await apiService.createEnvironment(payload);
      setEnvironments([...environments, created]);
      setShowModal(false); setNewName(''); setNewTier('CUSTOM'); setNewProtected(false);
      toast('environment created', 'success', created.name);
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to create environment';
      setCreateError(message);
      toast('environment creation failed', 'error', message);
    } finally { setCreating(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>// environments</div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: '26px', color: T.textPrimary, letterSpacing: '-0.02em' }}>
            Environments
          </h1>
        </div>
        <Btn T={T} variant="primary" onClick={() => setShowModal(true)}>+ new environment</Btn>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: '80px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', animation: 'pulse 1.4s infinite' }} />
          ))}
        </div>
      ) : environments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textSecondary, marginBottom: '8px' }}>
            <span style={{ color: T.termGreen }}>❯</span> no environments yet<span className="term-cursor" style={{ color: T.textSecondary }} />
          </p>
          <p style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted, marginBottom: '20px' }}>
            create one to assign values to your parameters
          </p>
          <Btn T={T} variant="primary" onClick={() => setShowModal(true)}>+ new environment</Btn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {environments.map(env => (
            <div
              key={env.id}
              style={{
                background: env.protected ? `${T.amber}08` : T.surface,
                border: `1px solid ${env.protected ? `${T.amber}40` : T.border}`,
                borderRadius: '6px', padding: '16px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary, marginBottom: '6px' }}>
                  {env.name}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted,
                    background: T.overlay, border: `1px solid ${T.border}`,
                    padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.05em',
                  }}>
                    {env.tier?.toLowerCase?.() ?? 'custom'}
                  </span>
                {env.protected && (
                  <span
                    title="Protected environments require elevated config permissions to reveal or write values"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
                      background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                      padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.05em',
                      cursor: 'default',
                    }}
                  >
                    <Shield size={9} strokeWidth={2} color={T.amber} />
                    PROTECTED
                  </span>
                )}
                </div>
              </div>

              <TrashButton
                T={T}
                label={`delete ${env.name}`}
                onClick={() => { setConfirmEnv(env); setDeleteError(null); }}
              />
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!confirmEnv}
        onClose={() => { setConfirmEnv(null); setDeleteError(null); }}
        entityName={confirmEnv?.name ?? ''}
        warningText={
          <>This will permanently delete <strong style={{ color: T.textPrimary }}>{confirmEnv?.name}</strong> and all its parameter values. This action cannot be undone.</>
        }
        onDelete={handleDelete}
        deleting={deleting}
        error={deleteError}
        deleteLabel="delete environment"
      />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setNewName(''); setNewTier('CUSTOM'); setNewProtected(false); setCreateError(null); }} title="new environment" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Environment name"
            placeholder="production, staging, dev…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            maxLength={32}
            autoFocus
          />

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>Tier</span>
            <select
              value={newTier}
              onChange={e => {
                const tier = e.target.value;
                setNewTier(tier);
                if (tier === 'PRODUCTION') setNewProtected(true);
              }}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                color: T.textPrimary,
                fontFamily: FONTS.mono,
                fontSize: '12px',
                padding: '9px 10px'
              }}
            >
              <option value="DEVELOPMENT">development</option>
              <option value="STAGING">staging</option>
              <option value="PRODUCTION">production</option>
              <option value="CUSTOM">custom</option>
            </select>
          </label>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px',
            background: newProtected ? `${T.amber}10` : T.overlay,
            border: `1px solid ${newProtected ? `${T.amber}40` : T.border}`,
            borderRadius: '4px',
          }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: newProtected ? T.amber : T.textMuted }}>
                protected environment
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                {newProtected ? 'reveal and write require elevated permission' : 'available to roles with non-protected config access'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewProtected(v => !v)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: newProtected ? T.amber : T.border,
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: newProtected ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: T.bg, transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>

          {createError && <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>{createError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewName(''); setNewTier('CUSTOM'); setNewProtected(false); setCreateError(null); }}>cancel</Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
