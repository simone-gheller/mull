import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useTheme, Btn, FONTS } from '@mull/ui';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import TrashButton from '../components/ui/TrashButton';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';

export default function Environments() {
  const { T } = useTheme();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState(false);
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
    window.addEventListener('mull:new', handler);
    return () => window.removeEventListener('mull:new', handler);
  }, []);

  const handleDelete = async () => {
    if (!confirmEnv) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiService.deleteEnvironment(confirmEnv.id);
      setEnvironments(envs => envs.filter(e => e.id !== confirmEnv.id));
      setConfirmEnv(null);
    } catch (e) {
      setDeleteError(e.response?.data?.message || 'Failed to delete environment');
    } finally { setDeleting(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const payload = { name: newName.trim() };
      if (newSecret) payload.isSecret = true;
      const created = await apiService.createEnvironment(payload);
      setEnvironments([...environments, created]);
      setShowModal(false); setNewName(''); setNewSecret(false);
    } catch (e) {
      setCreateError(e.response?.data?.message || 'Failed to create environment');
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
                background: env.isSecret ? `${T.amber}08` : T.surface,
                border: `1px solid ${env.isSecret ? `${T.amber}40` : T.border}`,
                borderRadius: '6px', padding: '16px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary, marginBottom: env.isSecret ? '6px' : 0 }}>
                  {env.name}
                </div>
                {env.isSecret && (
                  <span
                    title="All parameters in this environment are secret — only Admin and above can view or edit values"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
                      background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                      padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.05em',
                      cursor: 'default',
                    }}
                  >
                    <Lock size={9} strokeWidth={2} color={T.amber} />
                    SECRET
                  </span>
                )}
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

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setNewName(''); setNewSecret(false); setCreateError(null); }} title="new environment" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Environment name"
            placeholder="production, staging, dev…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px',
            background: newSecret ? `${T.amber}10` : T.overlay,
            border: `1px solid ${newSecret ? `${T.amber}40` : T.border}`,
            borderRadius: '4px',
          }}>
            <div>
              <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: newSecret ? T.amber : T.textMuted }}>
                secret environment
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                {newSecret ? 'all values always masked, ADMIN+ only' : 'values visible to all members'}
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

          {createError && <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>{createError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewName(''); setNewSecret(false); setCreateError(null); }}>cancel</Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
