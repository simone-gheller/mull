import { forwardRef, useState } from 'react';
import { useTheme, FONTS } from '@mull/ui';

const FormInput = forwardRef(function FormInput(
  { label, type = 'text', placeholder, error, prefix, suffix, ...rest },
  ref
) {
  const { T } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <div>
      {label && (
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', color: T.textMuted,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: T.surface, borderRadius: '4px',
        border: `1px solid ${error ? T.red : focused ? T.termGreen : T.border}`,
        boxShadow: focused && !error ? `0 0 0 3px ${T.termGreenBg}` : 'none',
        transition: 'all 0.13s', overflow: 'hidden',
      }}>
        {prefix && (
          <span style={{
            padding: '0 10px', fontFamily: FONTS.mono, fontSize: '12px',
            color: T.textMuted, background: T.overlay,
            borderRight: `1px solid ${T.border}`, display: 'flex', alignItems: 'center',
          }}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '8px 12px', fontFamily: FONTS.mono, fontSize: '12px',
            color: T.textPrimary,
          }}
          {...rest}
        />
        {suffix && (
          <span style={{
            padding: '0 10px', fontFamily: FONTS.mono, fontSize: '11px',
            color: T.termGreen, display: 'flex', alignItems: 'center',
          }}>
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.red, marginTop: '5px' }}>
          {error}
        </div>
      )}
    </div>
  );
});

export default FormInput;
