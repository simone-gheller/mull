import { useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';
import { QUICKSTART_STEPS } from '../content/quickstart.js';

export default function QuickstartPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="getting started" title="Quickstart">
        A compact setup path using only commands that exist in the current CLI.
      </PageTitle>
      <div style={{ display: 'grid', gap: '12px' }}>
        {QUICKSTART_STEPS.map(([title, command, output], index) => (
          <div key={title} className="step-row" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '16px', display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '14px' }}>
            <div style={{ fontFamily: FONTS.mono, color: T.termGreen, fontSize: '12px' }}>{String(index + 1).padStart(2, '0')}</div>
            <div style={{ display: 'grid', gap: '10px', minWidth: 0 }}>
              <h2 style={{ fontFamily: FONTS.display, fontSize: '16px', color: T.textPrimary }}>{title}</h2>
              {command.startsWith('vextis') || command.startsWith('curl') ? <CommandBlock T={T} command={command} /> : <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>{command}</p>}
              <OutputBlock T={T}>{output}</OutputBlock>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
