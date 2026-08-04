import { useState } from 'react';
import { FONTS } from '@vextis/ui';

// Purpose-built rather than @vextis/ui's terminal-block family (TermBlock/TermLine/Typewriter):
// those animate an out-of-view reveal for the landing page's product demo, but docs need
// commands to be static and instantly scannable with a copy button, not typewriter animation.
export function CommandBlock({ T, command, title = 'Shell' }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    };

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(command);
        } catch {
          if (!fallbackCopy()) throw new Error('copy failed');
        }
      } else if (!fallbackCopy()) {
        throw new Error('copy failed');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="command-block" style={{
      background: '#07090c',
      border: `1px solid ${T.border}`,
      borderRadius: '6px',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <div style={{
        height: '34px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 12px',
      }}>
        <span style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: '4px',
            color: copied ? T.termGreen : T.textMuted,
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: '10px',
            padding: '4px 7px',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '14px 16px',
        overflowX: 'auto',
        fontFamily: FONTS.mono,
        fontSize: '12px',
        lineHeight: 1.7,
        color: T.textPrimary,
      }}>
        <code>{command}</code>
      </pre>
    </div>
  );
}
