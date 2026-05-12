import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme, Btn, Badge, FONTS } from '@mull/ui';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Env value card ───────────────────────────────────────────────────────────

function DisabledActionTooltip({ children, T, message }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', right: 0,
          fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted,
          background: T.elevated, border: `1px solid ${T.border}`,
          padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 20,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

function EnvRow({ row, editLabel, canWrite, selected, T, onEdit, onSelect }) {
  const [visible, setVisible]           = useState(false);
  const [copied, setCopied]             = useState(false);
  const [revealHovered, setRevealHovered] = useState(false);

  const handleCopy = async () => {
    if (row.isRedacted || !row.value) return;
    try { await navigator.clipboard.writeText(row.value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const canReveal = row.isSet && !row.isRedacted;

  return (
    <div
      role="row"
      onClick={() => onSelect(row.valueId)}
      style={{
      display: 'grid', gridTemplateColumns: '160px 1fr 120px',
      alignItems: 'center', padding: '9px 14px',
      borderBottom: `1px solid ${T.border}`,
      background: selected ? T.overlay : 'transparent',
      borderLeft: `2px solid ${selected ? T.termGreen : 'transparent'}`,
      paddingLeft: '12px',
      cursor: 'pointer',
    }}>
      {/* ENV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Badge T={T} variant={row.protected ? 'warning' : 'default'}>{row.env}</Badge>
        {row.isInherited && (
          <span style={{
            fontFamily: FONTS.mono, fontSize: '9px', color: T.amber,
            background: `${T.amber}18`, border: `1px solid ${T.amber}40`,
            padding: '1px 5px', borderRadius: '2px',
          }}>↑ {row.inheritedFrom}</span>
        )}
      </div>

      {/* VALUE */}
      <div style={{ minWidth: 0 }}>
        <span style={{
          fontFamily: FONTS.mono, fontSize: '12px',
          color: row.isRedacted ? T.amber : !visible ? T.textMuted : !row.isSet ? T.textMuted : row.isInherited ? T.textSecondary : T.amber,
          letterSpacing: visible ? 'normal' : '0.1em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
          fontStyle: row.isRedacted || !row.isSet ? 'italic' : 'normal',
        }}>
          {row.isRedacted
            ? 'restricted'
            : !row.isSet
              ? 'unset'
              : visible
                ? row.value
                : '•'.repeat(Math.min(row.value?.length || 16, 20))}
        </span>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => { if (!visible) setRevealHovered(true); }}
          onMouseLeave={() => setRevealHovered(false)}
        >
          <Btn T={T} variant="secondary" size="sm" disabled={!canReveal} onClick={(event) => { event.stopPropagation(); if (canReveal) setVisible(v => !v); setRevealHovered(false); }}>
            {visible ? 'hide' : 'show'}
          </Btn>
          {revealHovered && canReveal && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 5px)', right: 0,
              fontFamily: FONTS.mono, fontSize: '9px', color: T.textMuted,
              background: T.elevated, border: `1px solid ${T.border}`,
              padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              click to reveal
            </div>
          )}
        </div>
        <Btn T={T} variant="secondary" size="sm" onClick={(event) => { event.stopPropagation(); handleCopy(); }} disabled={!visible || !row.value || row.isRedacted}>
          {copied ? 'copied!' : 'copy'}
        </Btn>
        {canWrite ? (
          <Btn T={T} variant="secondary" size="sm" onClick={(event) => { event.stopPropagation(); onEdit(row); }}>
            {editLabel}
          </Btn>
        ) : (
          <DisabledActionTooltip T={T} message="edit disabled · requires config write">
            <Btn T={T} variant="secondary" size="sm" disabled>
              {editLabel}
            </Btn>
          </DisabledActionTooltip>
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

// ─── History ─────────────────────────────────────────────────────────────────

const HISTORY_GRID = '90px 104px 96px 1fr 170px 140px';

function HistoryTable({ rows, loading, available, canWrite, reveals, T, onReveal, onRollback }) {
  if (!available) {
    return (
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '24px', textAlign: 'center',
      }}>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textMuted }}>
          History and rollback are available after creating a local override.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>
        loading history…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '6px', padding: '24px', textAlign: 'center',
      }}>
        <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textMuted }}>
          No previous versions yet
        </p>
      </div>
    );
  }

  return (
    <div role="table" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      <div role="row" style={{
        display: 'grid', gridTemplateColumns: HISTORY_GRID,
        padding: '6px 14px', borderBottom: `1px solid ${T.border}`,
        fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <span>version</span><span>environment</span><span>action</span><span>value</span><span>changed</span><span />
      </div>
      {rows.map(row => {
        const reveal = reveals[row.id] ?? {};
        const changedAt = new Date(row.createdAt).toLocaleString();
        return (
          <div key={row.id} role="row" style={{
            display: 'grid', gridTemplateColumns: HISTORY_GRID,
            alignItems: 'center', padding: '9px 14px',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.textPrimary }}>v{row.versionNumber}</span>
            <span style={{ display: 'inline-flex', maxWidth: '88px', overflow: 'hidden' }}>
              <Badge T={T} variant="default">{row.environment?.name ?? row.environmentName}</Badge>
            </span>
            <span style={{
              fontFamily: FONTS.mono, fontSize: '10px',
              color: row.changeType === 'ROLLBACK' ? T.amber : row.changeType === 'CLEAR' ? T.textMuted : T.blue,
            }}>
              {row.changeType.toLowerCase()}
            </span>
            <span style={{
              fontFamily: FONTS.mono, fontSize: '12px',
              color: !row.isSet ? T.textMuted : reveal.error ? T.amber : reveal.visible ? T.amber : T.textMuted,
              fontStyle: !row.isSet || reveal.error ? 'italic' : 'normal',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {!row.isSet
                ? 'unset'
                : reveal.error
                  ? 'restricted'
                  : reveal.visible
                    ? reveal.value
                    : '•'.repeat(16)}
            </span>
            <span style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted }}>
              {changedAt}
              <br />
              {row.createdBy?.displayName || row.createdBy?.email || 'unknown'}
            </span>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <Btn T={T} variant="secondary" size="sm" disabled={!row.isSet || reveal.loading} onClick={() => onReveal(row)}>
                {reveal.visible ? 'hide' : reveal.loading ? '…' : 'show'}
              </Btn>
              {canWrite ? (
                <Btn T={T} variant="secondary" size="sm" onClick={() => onRollback(row)}>
                  rollback
                </Btn>
              ) : (
                <DisabledActionTooltip T={T} message="rollback disabled · requires admin">
                  <Btn T={T} variant="secondary" size="sm" disabled>
                    rollback
                  </Btn>
                </DisabledActionTooltip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RollbackModal({ target, T, onConfirm, onCancel, rollingBack }) {
  if (!target) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '8px', padding: '24px', width: '460px', maxWidth: '90vw',
      }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.amber, letterSpacing: '0.12em', marginBottom: '8px' }}>
          // rollback value
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textPrimary, marginBottom: '8px' }}>
          Restore {target.environment?.name ?? target.environmentName} to v{target.versionNumber}?
        </div>
        <p style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textSecondary, lineHeight: 1.6, marginBottom: '16px' }}>
          Rollback creates a new current value and keeps the full history.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Btn T={T} variant="secondary" size="sm" onClick={onCancel}>cancel</Btn>
          <Btn T={T} variant="primary" size="sm" onClick={onConfirm} disabled={rollingBack}>
            {rollingBack ? 'rolling back…' : 'rollback'}
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
  const { orgSlug, appSlug, paramKey } = useParams();
  const navigate = useNavigate();
  const { T } = useTheme();
  const { orgs, orgId } = useAuth();

  const [resolved, setResolved] = useState(null);
  const [envValues, setEnvValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyReveals, setHistoryReveals] = useState({});
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [selectedValueId, setSelectedValueId] = useState(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setEnvValues([]);
    setHistoryRows([]);
    setHistoryReveals({});
    setSelectedValueId(null);

    const load = async () => {
      // 1. Resolve app by slug
      const apps = await apiService.getProjects();
      const app = apps.find(a => slugify(a.name) === appSlug);
      if (!app) return;

      // 2. Resolve parameter by key within that app
      const resolvedParams = await apiService.getResolvedParameters(app.id);
      const param = (resolvedParams.items ?? []).find(p => p.key === paramKey);
      if (!param) return;

      const r = {
        parameterId:          param.parameter.id,
        appId:                app.id,
        currentAppName:       app.name,
        sourceAppId:          param.parameter.appId,
        sourceAppName:        param.parameter.appName,
        isOwn:                param.relationship !== 'inherited',
        isOverride:           param.relationship === 'override',
        overrideSourceAppId:  param.overridden?.appId ?? '',
        overrideSourceParamId: param.overridden?.parameterId ?? '',
        overrideFromAppName:  param.overridden?.appName ?? '',
      };
      setResolved(r);

      // 3. Load values and environments
      const [ownGrouped, envList] = await Promise.all([
        apiService.getParameterValues(r.sourceAppId),
        apiService.getEnvironments(),
      ]);
      const envById = Object.fromEntries(
        (Array.isArray(envList) ? envList : []).map(e => [e.id, e])
      );

      let sourceGrouped = null;
      if (r.isOwn && r.isOverride && r.overrideSourceAppId && r.overrideSourceParamId) {
        sourceGrouped = await apiService.getParameterValues(r.overrideSourceAppId);
      }

      const rows = [];
      for (const [envName, envData] of Object.entries(ownGrouped)) {
        const ownMatch = envData.values.find(v => v.parameterId === r.parameterId);
        if (!ownMatch) continue;

        let isSet = ownMatch.isSet;
        let isRedacted = ownMatch.isSet && ownMatch.value === null;
        let value = ownMatch.isSet && !isRedacted ? (ownMatch.value ?? '') : '';
        let isInherited = false;

        if (!ownMatch.isSet && sourceGrouped) {
          const sourceEnvData = sourceGrouped[envName];
          const sourceMatch = sourceEnvData?.values.find(v => v.parameterId === r.overrideSourceParamId);
          if (sourceMatch?.isSet) {
            isSet = true;
            isRedacted = sourceMatch.value === null;
            value = isRedacted ? '' : sourceMatch.value ?? '';
            isInherited = true;
          }
        }

        rows.push({
          env: envName,
          environmentId: envData.environmentId,
          valueId: ownMatch.id,
          value,
          isSet,
          isRedacted,
          isInherited,
          inheritedFrom: isInherited ? r.overrideFromAppName : null,
          protected: envById[envData.environmentId]?.protected ?? false,
          tier: envById[envData.environmentId]?.tier ?? 'CUSTOM',
        });
      }

      setEnvValues(rows);
      setSelectedValueId(rows[0]?.valueId ?? null);
    };

    load().catch(console.error).finally(() => setLoading(false));
  }, [orgSlug, appSlug, paramKey, orgs, orgId, loadKey]);

  useEffect(() => {
    if (!resolved?.isOwn || !selectedValueId) {
      setHistoryRows([]);
      setHistoryLoading(false);
      return;
    }

    const selectedRow = envValues.find(row => row.valueId === selectedValueId);
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryReveals({});

    apiService.getParameterValueHistory(selectedValueId)
      .then(history => {
        if (cancelled) return;
        setHistoryRows((history.items ?? []).map(item => ({
          ...item,
          environmentName: selectedRow?.env,
        })));
      })
      .catch(error => {
        if (!cancelled) {
          console.error(error);
          setHistoryRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolved?.isOwn, selectedValueId, envValues]);

  const handleSave = async (newValue) => {
    if (!editingRow || !resolved) return;
    setSaving(true);
    try {
      if (!resolved.isOwn) {
        // Inherited → create override, then set value; reload via loadKey
        const { values } = await apiService.createParameterOverride(paramKey, resolved.appId);
        const targetValue = values.find(v => v.environmentId === editingRow.environmentId);
        if (targetValue) await apiService.updateParameterValue(targetValue.id, { value: newValue });
        setEditingRow(null);
        setLoadKey(k => k + 1);
      } else {
        await apiService.updateParameterValue(editingRow.valueId, { value: newValue });
        setEditingRow(null);
        setLoadKey(k => k + 1);
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleRevealHistory = async (row) => {
    const current = historyReveals[row.id];
    if (current?.visible) {
      setHistoryReveals(prev => ({ ...prev, [row.id]: { ...current, visible: false } }));
      return;
    }
    if (current?.value) {
      setHistoryReveals(prev => ({ ...prev, [row.id]: { ...current, visible: true } }));
      return;
    }

    setHistoryReveals(prev => ({ ...prev, [row.id]: { loading: true } }));
    try {
      const revealed = await apiService.revealParameterValueVersion(row.parameterValueId, row.id);
      setHistoryReveals(prev => ({ ...prev, [row.id]: { visible: true, value: revealed.value } }));
    } catch (e) {
      console.error(e);
      setHistoryReveals(prev => ({ ...prev, [row.id]: { error: true } }));
    }
  };

  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    setRollingBack(true);
    try {
      await apiService.rollbackParameterValue(rollbackTarget.parameterValueId, rollbackTarget.id);
      setRollbackTarget(null);
      setLoadKey(k => k + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setRollingBack(false);
    }
  };

  if (loading) {
    return <div style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>loading…</div>;
  }

  const { isOwn, isOverride, sourceAppName, overrideFromAppName, currentAppName } = resolved ?? {};
  const orgRole = orgs.find(o => o.id === orgId)?.role ?? 'DEVELOPER';
  const canWriteValues = ['DEVELOPER', 'ADMIN', 'OWNER'].includes(orgRole);
  const selectedEnvName = envValues.find(row => row.valueId === selectedValueId)?.env ?? '';
  const editLabel = isOwn ? 'edit' : 'override';
  const modalMode = isOwn ? 'own' : 'inherited';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <Btn T={T} variant="secondary" size="sm" onClick={() => navigate(-1)}>←</Btn>
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.termGreen, letterSpacing: '0.15em', marginBottom: '8px' }}>
            // parameters · detail
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
      {!isOwn && <InheritedBanner sourceAppName={sourceAppName} currentAppName={currentAppName} T={T} />}
      {isOwn && isOverride && <OverrideBanner sourceAppName={overrideFromAppName} T={T} />}

      {/* Values per environment */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          // values {selectedEnvName ? `· selected ${selectedEnvName}` : ''}
        </div>
        {envValues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary }}>
              No environments configured. Create an environment first.
            </p>
          </div>
        ) : (
          <div role="table" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div role="row" style={{
              display: 'grid', gridTemplateColumns: '160px 1fr 120px',
              padding: '6px 14px', borderBottom: `1px solid ${T.border}`,
              fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <span>environment</span><span>value</span><span />
            </div>
            {envValues.map(row => (
              <EnvRow
                key={row.env}
                row={row}
                editLabel={editLabel}
                canWrite={canWriteValues && (!row.protected || ['ADMIN', 'OWNER'].includes(orgRole))}
                selected={row.valueId === selectedValueId}
                T={T}
                onEdit={setEditingRow}
                onSelect={setSelectedValueId}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          // history
        </div>
        <HistoryTable
          rows={historyRows}
          loading={historyLoading}
          available={Boolean(isOwn)}
          canWrite={canWriteValues}
          reveals={historyReveals}
          T={T}
          onReveal={handleRevealHistory}
          onRollback={setRollbackTarget}
        />
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
      <RollbackModal
        target={rollbackTarget}
        T={T}
        onConfirm={handleConfirmRollback}
        onCancel={() => setRollbackTarget(null)}
        rollingBack={rollingBack}
      />
    </div>
  );
}
