import { Link, useOutletContext } from 'react-router-dom';
import { FONTS } from '@vextis/ui';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { Table } from '../components/content/Table.jsx';
import { Callout } from '../components/content/Callout.jsx';

export default function AuthenticationPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="core concept" title="Authentication">
        Every request — from the dashboard, the CLI, or a script calling the API directly — carries an <code>Authorization: Bearer &lt;token&gt;</code> header. vextis normalizes three different credential types into the same permission model.
      </PageTitle>

      <SmallHeading T={T} id="credential-types">Credential types</SmallHeading>
      <Table T={T} rows={[
        ['Supabase JWT', 'Dashboard session token (ES256, verified via JWKS). Used by the web app.'],
        ['vextis_pat_*', 'Personal access token, created under a user. Same permissions as that user\'s role — see Tokens.'],
        ['vextis_st_*', 'Organization service token, scoped to explicit access-key scopes — see Tokens.'],
      ]} firstColumnWidth="150px" />

      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Check what a token resolves to" command={'curl -s https://api.vextis.io/auth/whoami -H "Authorization: Bearer $VEXTIS_TOKEN"'} />

      <div style={{ height: '20px' }} />
      <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textSecondary, lineHeight: 1.7 }}>
        Whichever credential type authenticates a request, the backend normalizes it into the same actor shape internally — identity, org, role or scopes, and any app/environment binding — so authorization checks downstream don't need to know which credential type made the call.
      </p>

      <div style={{ height: '20px' }} />
      <Callout T={T}>
        For the full endpoint-by-endpoint reference — every request/response schema, every field — see the <Link to="/api" style={{ color: T.termGreen }}>API reference</Link>.
      </Callout>
    </>
  );
}
