import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { Screenshot } from '../components/content/Screenshot.jsx';

export default function OrganizationsPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="core concept" title="Organizations">
        An organization is the root of the resource hierarchy — every app, environment, member, role, and access key belongs to exactly one organization.
      </PageTitle>

      <Screenshot
        T={T}
        src="/screenshots/dashboard-overview.png"
        alt="The vextis dashboard overview, with the active organization shown in the top-left switcher."
        caption="The active organization is always visible in the dashboard's sidebar switcher."
      />

      <SmallHeading T={T}>Switching organizations from the CLI</SmallHeading>
      <CommandBlock T={T} title="List orgs" command="vextis org list" />
      <div style={{ height: '10px' }} />
      <OutputBlock T={T}>{'  ▸ Acme          (active)\n    Personal Org\n\n  ↳ to add another org: vextis auth login'}</OutputBlock>
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Switch active org" command="vextis org use acme" />

      <div style={{ height: '20px' }} />
      <Callout T={T}>
        The active organization is stored in <code>~/.vextis/config.json</code> as <code>activeOrgId</code> and determines which org and token every CLI command uses. Signing in to another organization with <code>vextis auth login</code> adds it to that file rather than replacing your existing sessions.
      </Callout>
    </>
  );
}
