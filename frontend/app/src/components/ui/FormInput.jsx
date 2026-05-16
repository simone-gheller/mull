import { forwardRef, useState } from 'react';
import { useTheme, FONTS } from '@vextis/ui';

const FormInput = forwardRef(function FormInput(
  { label, type = 'text', placeholder, error, prefix, suffix, readOnly, maxLength, onChange, ...rest },
  ref
) {
  const { T } = useTheme();
  const [focused, setFocused] = useState(false);
  const [uncontrolledLen, setUncontrolledLen] = useState(0);

  const handleChange = (e) => {
    if (rest.value == null) setUncontrolledLen(e.target.value.length);
    onChange?.(e);
  };

  const charCount = rest.value != null ? (rest.value?.length ?? 0) : uncontrolledLen;
  const showCounter = maxLength != null && charCount > 0;
  const atLimit = maxLength != null && charCount >= maxLength;
  const nearLimit = maxLength != null && charCount >= Math.ceil(maxLength * 0.8);

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
        background: readOnly ? T.overlay : T.surface, borderRadius: '4px',
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
          readOnly={readOnly}
          maxLength={maxLength}
          onFocus={() => !readOnly && setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '8px 12px', fontFamily: FONTS.mono, fontSize: '12px',
            color: readOnly ? T.textMuted : T.textPrimary,
            cursor: readOnly ? 'default' : 'text',
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
      {error ? (
        <div style={{ fontFamily: FONTS.mono, fontSize: '10px', color: T.red, marginTop: '5px' }}>
          {error}
        </div>
      ) : showCounter ? (
        <div style={{
          fontFamily: FONTS.mono, fontSize: '10px', marginTop: '4px', textAlign: 'right',
          color: atLimit ? T.red : nearLimit ? T.amber : T.textMuted,
        }}>
          {charCount}/{maxLength}
        </div>
      ) : null}
    </div>
  );
});

export default FormInput;
