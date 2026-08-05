import { useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { DocCard } from '../components/content/DocCard.jsx';

export default function AboutVextisPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="about" title="About vextis">
        vextis is secure configuration management for local development and CI — a place to model organizations, apps, environments, and parameters once, then read them from the CLI wherever your code runs.
      </PageTitle>

      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.75, maxWidth: '660px', marginBottom: '20px' }}>
        The problem vextis solves: config and secrets end up scattered across <code>.env</code> files, CI variables, and cloud consoles, each with its own access model and no shared audit trail. vextis gives every value one home — encrypted at rest, scoped by role and environment, with inheritance so a value set once at the org level doesn't need to be copy-pasted into every app.
      </p>

      <div className="card-grid">
        <DocCard T={T} title="One hierarchy" body="Organizations contain apps, apps can nest, and every app has its environments. A parameter set at a parent level is inherited everywhere below it — see Inheritance." />
        <DocCard T={T} title="Encrypted by default" body="Every value is envelope-encrypted — a per-value data key wrapped by a versioned master key. There's no plaintext-at-rest mode to opt out of." />
        <DocCard T={T} title="CLI-first workflow" body="vextis auth login, vextis link, and vextis run wrap the API so day-to-day usage never touches raw tokens or endpoints." />
        <DocCard T={T} title="Built for teams" body="Roles, scoped access tokens, and audit logs exist from the start, not bolted on later — see Roles and Audit logs." />
      </div>
    </>
  );
}
