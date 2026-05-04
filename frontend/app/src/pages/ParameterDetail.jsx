import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme, Btn, Badge, FONTS } from '@mull/ui';
import apiService from '../services/api';

// ─── Env value card ───────────────────────────────────────────────────────────

function EnvCard({ row, editLabel, T, onEdit }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(row.value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: '6px', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge T={T} variant="info">{row.env}</Badge>
          {row.isInherited && (
            <span style={{
              fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
              background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
              padding: '1px 6px', borderRadius: '2px',
            }}>
              from {row.inheritedFrom}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Btn T={T} variant="secondary" size="sm" onClick={() => setVisible(v => !v)}>
            {visible ? 'hide' : 'show'}
          </Btn>
          <Btn T={T} variant="secondary" size="sm" onClick={() => onEdit(row)}>
            {editLabel}
          </Btn>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: '4px', padding: '10px 12px' }}>
          <pre style={{
            fontFamily: FONTS.mono, fontSize: '12px', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: visible ? (row.isInherited ? T.textSecondary : T.amber) : T.textMuted,
            letterSpacing: visible ? 'normal' : '0.12em',
          }}>
            {visible ? (row.value || '(empty)') : '•'.repeat(Math.min(row.value?.length || 16, 24))}
          </pre>
        </div>
        {visible && row.value && (
          <button onClick={handleCopy} style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONTS.mono, fontSize: '10px',
            color: copied ? T.termGreen : T.textMuted,
          }}>
            {copied ? 'copied!' : 'copy'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ row, mode, sourceAppName, currentAppName, T, onSave, onCancel, saving }) {
  const [value, setValue] = useState(row.value ?? '');
  const isInherited = mode === 'inherited';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90vw',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.12em', marginBottom: '4px' }}>
            // {isInherited ? 'create override' : 'edit value'}
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '13px', color: T.textPrimary }}>{row.env}</div>
        </div>

        {isInherited && (
          <div style={{
            padding: '10px 14px', marginBottom: '16px',
            background: `${T.amber}12`, border: `1px solid ${T.amber}40`,
            borderLeft: `3px solid ${T.amber}`, borderRadius: '4px',
          }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.amber, marginBottom: '3px' }}>
              inherited from {sourceAppName}
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary }}>
              Saving creates a local override in <strong style={{ color: T.textPrimary }}>{currentAppName}</strong>.
              {' '}The value in <strong style={{ color: T.textPrimary }}>{sourceAppName}</strong> stays unchanged and is used as fallback if the override is removed.
            </div>
          </div>
        )}

        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          style={{
            width: '100%', minHeight: '90px', resize: 'vertical',
            background: T.bg, border: `1px solid ${T.termGreen}`,
            borderRadius: '4px', padding: '10px 12px', boxSizing: 'border-box',
            fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary, outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <Btn T={T} variant="secondary" size="sm" onClick={onCancel}>cancel</Btn>
          <Btn T={T} variant="primary" size="sm" onClick={() => onSave(value)} disabled={saving}>
            {saving ? 'saving…' : isInherited ? 'create override' : 'save'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Banners ──────────────────────────────────────────────────────────────────

function InheritedBanner({ sourceAppName, currentAppName, T }) {
  return (
    <div style={{
      padding: '12px 16px', marginBottom: '24px',
      background: `${T.amber}0d`, border: `1px solid ${T.amber}30`,
      borderLeft: `3px solid ${T.amber}`, borderRadius: '5px',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
    }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: '14px', color: T.amber, marginTop: '1px' }}>↑</span>
      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.amber, marginBottom: '3px' }}>
          inherited from {sourceAppName}
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary }}>
          These are the current values from the ancestor app. Click <strong style={{ color: T.textPrimary }}>override</strong> on an environment to set a local value in <strong style={{ color: T.textPrimary }}>{currentAppName}</strong>.
        </div>
      </div>
    </div>
  );
}

function OverrideBanner({ sourceAppName, T }) {
  return (
    <div style={{
      padding: '12px 16px', marginBottom: '24px',
      background: `${T.blue}0d`, border: `1px solid ${T.blue}30`,
      borderLeft: `3px solid ${T.blue}`, borderRadius: '5px',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
    }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: '14px', color: T.blue, marginTop: '1px' }}>⬡</span>
      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.blue, marginBottom: '3px' }}>
          override · shadows {sourceAppName}
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary }}>
          Environments without a local value fall back to <strong style={{ color: T.textPrimary }}>{sourceAppName}</strong>'s value.
          If this override is removed entirely, all environments revert to <strong style={{ color: T.textPrimary }}>{sourceAppName}</strong>.
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParameterDetail() {
  const { parameterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { T } = useTheme();

  const appId               = searchParams.get('appId');
  const sourceAppId         = searchParams.get('sourceAppId') || appId;
  const sourceAppName       = searchParams.get('sourceAppName') || '';
  const currentAppName      = searchParams.get('currentAppName') || '';
  const paramKey            = searchParams.get('key') || '';
  const isOwn               = searchParams.get('own') !== '0';
  const isOverride          = searchParams.get('isOverride') === '1';
  const overrideFromAppName = searchParams.get('overrideFromAppName') || '';
  // For override: IDs of the source (shadowed) parameter so we can show fallback values
  const overrideSourceAppId   = searchParams.get('overrideSourceAppId') || '';
  const overrideSourceParamId = searchParams.get('overrideSourceParamId') || '';

  const [envValues, setEnvValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sourceAppId) { setLoading(false); return; }
    setLoading(true);

    const load = async () => {
      // Load the primary values (own app for own/override, ancestor for inherited)
      const ownGrouped = await apiService.getParameterValues(sourceAppId);

      // For override params: also load source values to use as fallback for empty envs
      let sourceGrouped = null;
      if (isOwn && isOverride && overrideSourceAppId && overrideSourceParamId) {
        sourceGrouped = await apiService.getParameterValues(overrideSourceAppId);
      }

      const rows = [];
      for (const [envName, envData] of Object.entries(ownGrouped)) {
        const ownMatch = envData.values.find(v => v.parameterId === parameterId);
        if (!ownMatch) continue;

        let value = ownMatch.value ?? '';
        let isInherited = false;

        // If own value is empty and we have a source fallback, use it
        if (!value && sourceGrouped) {
          const sourceEnvData = sourceGrouped[envName];
          const sourceMatch = sourceEnvData?.values.find(v => v.parameterId === overrideSourceParamId);
          if (sourceMatch?.value) {
            value = sourceMatch.value;
            isInherited = true;
          }
        }

        rows.push({
          env: envName,
          environmentId: envData.environmentId,
          valueId: ownMatch.id,   // always own param's valueId — saves always go to own
          value,
          isInherited,
          inheritedFrom: isInherited ? overrideFromAppName : null,
        });
      }

      setEnvValues(rows);
    };

    load().catch(console.error).finally(() => setLoading(false));
  }, [parameterId, sourceAppId, isOwn, isOverride, overrideSourceAppId, overrideSourceParamId]);

  const handleSave = async (newValue) => {
    if (!editingRow) return;
    setSaving(true);
    try {
      if (!isOwn) {
        // Inherited → create override in current app, then set this env's value
        const { parameter, values } = await apiService.createParameterOverride(paramKey, appId);
        const targetValue = values.find(v => v.environmentId === editingRow.environmentId);
        if (targetValue) {
          await apiService.updateParameterValue(targetValue.id, { value: newValue });
        }
        setEditingRow(null);
        // Navigate to override param, preserving source info for fallback loading
        navigate(
          `/dashboard/parameters/${parameter.id}` +
          `?appId=${appId}` +
          `&sourceAppId=${appId}` +
          `&sourceAppName=${encodeURIComponent(currentAppName)}` +
          `&currentAppName=${encodeURIComponent(currentAppName)}` +
          `&key=${encodeURIComponent(paramKey)}` +
          `&own=1` +
          `&isOverride=1` +
          `&overrideFromAppName=${encodeURIComponent(sourceAppName)}` +
          `&overrideSourceAppId=${encodeURIComponent(sourceAppId)}` +
          `&overrideSourceParamId=${encodeURIComponent(parameterId)}`,
          { replace: true }
        );
      } else {
        // Own or override: update value in place
        const updated = await apiService.updateParameterValue(editingRow.valueId, { value: newValue });
        setEnvValues(prev => prev.map(r => {
          if (r.valueId !== editingRow.valueId) return r;
          const v = updated.value ?? newValue;
          // If value cleared → check if fallback applies (will reload on next render cycle)
          return { ...r, value: v, isInherited: false, inheritedFrom: null };
        }));
        setEditingRow(null);
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) {
    return <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>loading…</div>;
  }

  const editLabel = isOwn ? 'edit' : 'override';
  const modalMode = isOwn ? 'own' : 'inherited';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <Btn T={T} variant="secondary" size="sm" onClick={() => navigate(-1)}>←</Btn>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '4px' }}>
            // parameter
          </div>
          <h1 style={{ fontFamily: FONTS.mono, fontWeight: 500, fontSize: '20px', color: T.textPrimary, letterSpacing: '0.02em' }}>
            {paramKey}
          </h1>
        </div>
        {!isOwn && (
          <span style={{
            fontFamily: FONTS.mono, fontSize: '10px', color: T.amber,
            background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
            padding: '3px 10px', borderRadius: '3px',
          }}>
            inherited · {sourceAppName}
          </span>
        )}
        {isOwn && isOverride && (
          <span style={{
            fontFamily: FONTS.mono, fontSize: '10px', color: T.blue,
            background: `${T.blue}18`, border: `1px solid ${T.blue}40`,
            padding: '3px 10px', borderRadius: '3px',
          }}>
            override · {overrideFromAppName}
          </span>
        )}
      </div>

      {/* Contextual banner */}
      {!isOwn && (
        <InheritedBanner sourceAppName={sourceAppName} currentAppName={currentAppName} T={T} />
      )}
      {isOwn && isOverride && (
        <OverrideBanner sourceAppName={overrideFromAppName} T={T} />
      )}

      {/* Values per environment */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          // values
        </div>
        {envValues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary }}>
              No environments configured. Create an environment first.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {envValues.map(row => (
              <EnvCard key={row.env} row={row} editLabel={editLabel} T={T} onEdit={setEditingRow} />
            ))}
          </div>
        )}
      </div>

      {/* History — placeholder */}
      <div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          // history
        </div>
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '6px', padding: '32px 24px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: '20px', color: T.textMuted, marginBottom: '8px' }}>◌</div>
          <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textMuted }}>
            Value history coming soon
          </p>
        </div>
      </div>

      {/* Edit / override modal */}
      {editingRow && (
        <EditModal
          row={editingRow}
          mode={modalMode}
          sourceAppName={sourceAppName}
          currentAppName={currentAppName}
          T={T}
          onSave={handleSave}
          onCancel={() => setEditingRow(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
