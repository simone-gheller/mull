import { useEffect, useState } from 'react';
import { useTheme, Btn, FONTS } from '@mull/ui';
import Modal from './Modal';
import FormInput from './FormInput';

export default function DeleteConfirmModal({ isOpen, onClose, entityName, warningText, onDelete, deleting, error, deleteLabel = 'delete' }) {
  const { T } = useTheme();
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => { if (!isOpen) setConfirmInput(''); }, [isOpen]);

  const handleClose = () => { setConfirmInput(''); onClose(); };
  const canDelete = confirmInput === entityName && !deleting;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={deleteLabel} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          padding: '10px 12px',
          background: `${T.red}10`, border: `1px solid ${T.red}30`,
          borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
          fontFamily: FONTS.mono, fontSize: '11px', color: T.textSecondary, lineHeight: 1.6,
        }}>
          {warningText}
        </div>

        <FormInput
          label={`Type "${entityName}" to confirm`}
          placeholder={entityName}
          value={confirmInput}
          onChange={e => setConfirmInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canDelete && onDelete()}
          autoFocus
        />

        {error && (
          <div style={{
            padding: '8px 12px',
            background: T.redBg, border: `1px solid ${T.redBorder}`,
            borderLeft: `3px solid ${T.red}`, borderRadius: '4px',
            fontFamily: FONTS.mono, fontSize: '11px', color: T.red,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
          <Btn T={T} variant="secondary" size="sm" onClick={handleClose}>cancel</Btn>
          <Btn T={T} variant="danger" size="sm" onClick={onDelete} disabled={!canDelete}>
            {deleting ? 'deleting…' : deleteLabel}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
