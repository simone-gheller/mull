import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { DocCard } from '../components/content/DocCard.jsx';
import { Callout } from '../components/content/Callout.jsx';

export default function SecretsVisibilityPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="core concept" title="Secrets & visibility">
        Every parameter value is treated as sensitive by default — there's no separate "secret" flag to remember to set. Visibility is controlled by scope and role, not by how a value was created.
      </PageTitle>

      <div className="card-grid">
        <DocCard T={T} title="config:reveal" body="Controls who can read plaintext values. Everyone with config:read can see that a value is set; only config:reveal holders can see what it is." />
        <DocCard T={T} title="Protected environments" body="Production-like environments can require Admin or Owner for reveal and write, even for members who'd otherwise have config:reveal — see Roles." />
        <DocCard T={T} title="Blank means inherit" body="Setting an empty value clears the local override and falls back to the parent environment instead of storing an empty secret." />
        <DocCard T={T} title="Decrypted only at read time" body="Values are envelope-encrypted at rest; decryption happens in backend route handlers after auth checks, never earlier." />
      </div>

      <div style={{ height: '20px' }} />
      <SmallHeading T={T} id="is-set">The is-set flag</SmallHeading>
      <Callout T={T}>
        Inheritance is driven by an explicit <code>isSet</code> flag, never by inspecting ciphertext or comparing values to an empty string. <code>isSet=false</code> means "unset locally, inherit from an ancestor environment"; <code>isSet=true</code> means "this value shadows any ancestor." Writing an empty string sets <code>isSet=false</code> rather than storing an intentional empty secret — see Inheritance for how that fallback resolves.
      </Callout>
    </>
  );
}
