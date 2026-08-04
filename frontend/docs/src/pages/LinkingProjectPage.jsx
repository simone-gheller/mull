import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { Table } from '../components/content/Table.jsx';

export default function LinkingProjectPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="cli" title="Linking a project">
        Bind a working tree to an app and environment so config commands don't need --app and --env every time.
      </PageTitle>

      <CommandBlock T={T} command="vextis link" />
      <div style={{ height: '10px' }} />
      <OutputBlock T={T}>{'✓ Written to .vextis/config.json\n↳ app api  env development'}</OutputBlock>
      <div style={{ height: '14px' }} />
      <Callout T={T} type="warning">
        The CLI writes local links to <code>.vextis/config.json</code> in the repository root — add <code>.vextis/</code> to <code>.gitignore</code> so it doesn't get committed. `vextis link` warns you if it isn't already ignored.
      </Callout>

      <div style={{ height: '24px' }} />
      <SmallHeading T={T}>Two config files, two scopes</SmallHeading>
      <Table T={T} rows={[
        ['~/.vextis/config.json', 'Global — your organizations, active org, and tokens. Written by vextis auth login / org use.'],
        ['.vextis/config.json', 'Local — the active app and environment for this working tree. Written by vextis link / app use / env use.'],
      ]} firstColumnWidth="220px" />

      <div style={{ height: '24px' }} />
      <SmallHeading T={T}>Check what's linked</SmallHeading>
      <CommandBlock T={T} title="Show context" command="vextis context" />
      <div style={{ height: '10px' }} />
      <OutputBlock T={T}>{'org   acme          ~/.vextis/config.json\napp   api           .vextis/config.json\nenv   development   .vextis/config.json'}</OutputBlock>
    </>
  );
}
