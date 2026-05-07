import { useEffect, useState } from 'react';
import { useTheme, Btn, FONTS } from '@mull/ui';
import apiService from '../services/api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

export default function Environments() {
  const { T } = useTheme();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSecret, setNewSecret] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiService.getEnvironments()
      .then(data => setEnvironments(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true); setError(null);
    try {
      const payload = { name: newName.trim() };
      if (newSecret) payload.isSecret = true;
      const created = await apiService.createEnvironment(payload);
      setEnvironments([...environments, created]);
      setShowModal(false); setNewName(''); setNewSecret(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create environment');
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
          <div style={{ fontFamily: FONTS.mono, fontSize: '32px', color: T.textMuted, marginBottom: '12px' }}>▷</div>
          <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary, marginBottom: '16px' }}>
            No environments yet. Create one to assign values to parameters.
          </p>
          <Btn T={T} variant="primary" onClick={() => setShowModal(true)}>create first environment</Btn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {environments.map(env => (
            <div key={env.id} style={{
              background: env.isSecret ? `${T.amber}08` : T.surface,
              border: `1px solid ${env.isSecret ? `${T.amber}40` : T.border}`,
              borderRadius: '6px', padding: '16px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary, marginBottom: env.isSecret ? '6px' : 0 }}>
                  {env.name}
                </div>
                {env.isSecret && (
                  <span style={{
                    fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
                    background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
                    padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.05em',
                  }}>
                    ◈ SECRET
                  </span>
                )}
              </div>
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: FONTS.mono, fontSize: '11px', color: T.textMuted,
                padding: '4px 8px',
              }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setNewName(''); setNewSecret(false); setError(null); }} title="new environment" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="Environment name"
            placeholder="production, staging, dev…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
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

          {error && <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn T={T} variant="secondary" size="sm" onClick={() => { setShowModal(false); setNewName(''); setNewSecret(false); setError(null); }}>cancel</Btn>
            <Btn T={T} variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'creating…' : 'create'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
