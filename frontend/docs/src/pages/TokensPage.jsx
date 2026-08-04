import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { Table } from '../components/content/Table.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { TOKEN_SCOPES, TOKEN_FORMATS } from '../content/tokenScopes.js';

export default function TokensPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="security" title="Access tokens">
        Use personal tokens for developer automation and organization access keys for CI/CD.
      </PageTitle>
      <Callout T={T} type="warning">Tokens are shown once. Store automation tokens in your CI provider secret store immediately.</Callout>

      <div style={{ height: '20px' }} />
      <SmallHeading T={T} id="formats">Token formats</SmallHeading>
      <Table T={T} rows={TOKEN_FORMATS} firstColumnWidth="260px" />

      <div style={{ height: '20px' }} />
      <SmallHeading T={T} id="scopes">Scopes</SmallHeading>
      <Table T={T} rows={TOKEN_SCOPES} firstColumnWidth="190px" />
    </>
  );
}
