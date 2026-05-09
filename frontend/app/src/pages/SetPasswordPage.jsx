import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, FONTS, Btn } from '@mull/ui';
import { supabase } from '../lib/supabase';
import FormInput from '../components/ui/FormInput';

export default function SetPasswordPage() {
  const { T } = useTheme();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isValid = password.length >= 8 && password === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.bg, padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '8px', padding: '36px 32px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: '16px', color: T.textPrimary, marginBottom: '4px' }}>
            Set your password
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: '12px', color: T.textMuted }}>
            Choose a password to secure your account.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormInput
            label="Password"
            type="password"
            placeholder="at least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          <FormInput
            label="Confirm password"
            type="password"
            placeholder="repeat password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {confirm && password !== confirm && (
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>
            Passwords don't match.
          </div>
        )}

        {error && (
          <div style={{ fontFamily: FONTS.mono, fontSize: '11px', color: T.red }}>
            {error}
          </div>
        )}

        <Btn T={T} variant="primary" size="md" onClick={handleSubmit} disabled={!isValid || saving}>
          {saving ? 'saving…' : 'set password & continue'}
        </Btn>
      </div>
    </div>
  );
}
