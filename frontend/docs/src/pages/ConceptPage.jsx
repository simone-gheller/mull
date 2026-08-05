import { useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { Screenshot } from '../components/content/Screenshot.jsx';
import { CONCEPTS } from '../content/quickstart.js';

export default function ConceptPage({ title, screenshot }) {
  const { T } = useOutletContext();
  const concept = CONCEPTS.find(([name]) => name === title) ?? CONCEPTS[0];

  return (
    <>
      <PageTitle T={T} label="core concept" title={concept[0]}>
        {concept[1]}
      </PageTitle>
      {screenshot && <Screenshot T={T} {...screenshot} />}
      <div className="card-grid">
        {CONCEPTS.map(([name, body]) => (
          <div key={name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '6px', padding: '16px' }}>
            <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', color: T.textPrimary, marginBottom: '7px' }}>{name}</h2>
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
