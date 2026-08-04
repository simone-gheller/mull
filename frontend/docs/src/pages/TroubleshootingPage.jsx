import { useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { TROUBLESHOOTING } from '../content/troubleshooting.js';

export default function TroubleshootingPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="reference" title="Troubleshooting">
        Common setup, token, and permission issues.
      </PageTitle>
      <div style={{ display: 'grid', gap: '8px' }}>
        {TROUBLESHOOTING.map(([title, body]) => (
          <details key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '12px 14px' }}>
            <summary style={{ cursor: 'pointer', fontFamily: FONTS.display, fontSize: '14px', color: T.textPrimary, fontWeight: 600 }}>
              {title}
            </summary>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6, marginTop: '9px' }}>{body}</p>
          </details>
        ))}
      </div>
    </>
  );
}
