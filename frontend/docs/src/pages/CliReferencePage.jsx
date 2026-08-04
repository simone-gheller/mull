import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { Table } from '../components/content/Table.jsx';
import { CLI_COMMAND_GROUPS, CLI_ENV_VARS } from '../content/cliCommands.js';

export default function CliReferencePage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="reference" title="CLI reference">
        The full command surface, grouped the same way as `vextis help`.
      </PageTitle>
      <div style={{ display: 'grid', gap: '22px' }}>
        {CLI_COMMAND_GROUPS.map(group => (
          <div key={group.title}>
            <SmallHeading T={T} id={group.title.toLowerCase().replace(/\s+/g, '-')}>{group.title}</SmallHeading>
            <Table T={T} rows={group.commands.map(([cmd, body]) => [`vextis ${cmd}`, body])} firstColumnWidth="340px" />
          </div>
        ))}
        <div>
          <SmallHeading T={T} id="environment-variables">Environment variables</SmallHeading>
          <Table T={T} rows={CLI_ENV_VARS} firstColumnWidth="220px" />
        </div>
      </div>
    </>
  );
}
