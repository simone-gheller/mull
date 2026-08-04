import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { Table } from '../components/content/Table.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { SYSTEM_ROLES, ROLE_SCOPES } from '../content/roles.js';

export default function RolesPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="security" title="Roles & permissions">
        Every organization member holds a role. Each role is a fixed set of scopes — the same scope model access tokens use.
      </PageTitle>

      <SmallHeading T={T} id="system-roles">System roles</SmallHeading>
      <Table T={T} rows={SYSTEM_ROLES} firstColumnWidth="130px" />

      <div style={{ height: '20px' }} />
      <Callout T={T}>
        Developer and Viewer both lose <code>config:reveal</code>/<code>config:write</code> on protected environments — plaintext reveal and writes there require Admin or Owner. Custom roles (paid plans) compose the same scopes listed below.
      </Callout>

      <div style={{ height: '24px' }} />
      <SmallHeading T={T} id="scopes">Scopes</SmallHeading>
      <Table T={T} rows={ROLE_SCOPES} firstColumnWidth="230px" />
    </>
  );
}
