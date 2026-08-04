import { useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { Table } from '../components/content/Table.jsx';
import { Callout } from '../components/content/Callout.jsx';

export default function ApiBasicsPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="reference" title="API basics">
        Notes for calling the REST API directly instead of through the CLI. Not a full endpoint reference — see the CLI reference for the commands that wrap these calls.
      </PageTitle>

      <SmallHeading T={T} id="base-url">Base URL</SmallHeading>
      <Table T={T} rows={[
        ['Production', 'https://api.vextis.io'],
        ['Local development', 'http://localhost:3000'],
      ]} firstColumnWidth="180px" />

      <div style={{ height: '20px' }} />
      <SmallHeading T={T} id="auth">Authentication</SmallHeading>
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.7, marginBottom: '12px' }}>
        Every request carries an <code>Authorization: Bearer &lt;token&gt;</code> header. The API accepts three credential types:
      </p>
      <Table T={T} rows={[
        ['Supabase JWT', 'Dashboard session token (ES256, verified via JWKS). Used by the web app.'],
        ['vextis_pat_*', 'Personal access token, created under a user. Same permissions as that user\'s role.'],
        ['vextis_st_*', 'Organization service token, scoped to explicit access-key scopes — see Access tokens.'],
      ]} firstColumnWidth="150px" />
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Check what a token resolves to" command={'curl -s https://api.vextis.io/auth/whoami -H "Authorization: Bearer $VEXTIS_TOKEN"'} />

      <div style={{ height: '20px' }} />
      <SmallHeading T={T} id="representative-endpoints">Representative endpoints</SmallHeading>
      <Table T={T} rows={[
        ['GET /auth/whoami', 'Normalized actor/auth context — works for JWT, PAT, and service tokens.'],
        ['GET /orgs/:orgId/apps', 'List apps in an organization.'],
        ['GET /orgs/:orgId/environments', 'List environments in an organization.'],
        ['GET /orgs/:orgId/parameters/resolved?appId=&environmentId=', 'Resolved parameter definitions, with inheritance applied, for one app + environment.'],
        ['GET /orgs/:orgId/config/:appId/:envId', 'Fully rendered config for an app/environment — what `vextis config pull` calls.'],
      ]} firstColumnWidth="360px" />

      <div style={{ height: '20px' }} />
      <Callout T={T}>
        Every <code>:orgId</code> path parameter must be a UUIDv7 (<code>^[0-9a-f]{'{8}'}-[0-9a-f]{'{4}'}-7[0-9a-f]{'{3}'}-...</code>) — the API rejects UUIDv4 or malformed IDs.
      </Callout>
    </>
  );
}
