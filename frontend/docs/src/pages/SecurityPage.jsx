import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { DocCard } from '../components/content/DocCard.jsx';

export default function SecurityPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="security" title="Security model">
        vextis treats all parameter values as sensitive by default.
      </PageTitle>
      <div className="card-grid">
        <DocCard T={T} title="Encrypted at rest" body="Each value is wrapped in an envelope: a per-value AES-256-GCM data key, itself encrypted by a versioned master key. Decryption happens only in backend route handlers after auth checks." />
        <DocCard T={T} title="Scoped access" body="Tokens can be limited by app, environment, and permission scope — see Access tokens and Roles & permissions." />
        <DocCard T={T} title="Audit trail" body="Reads, writes, reveals, and token activity are recorded — see Audit logs." />
        <DocCard T={T} title="Blank means inherit" body="Setting an empty value clears the local override and falls back to the parent environment instead of storing an empty secret." />
      </div>
    </>
  );
}
