import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { INSTALL_COMMAND } from '../content/quickstart.js';

export default function InstallPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="cli" title="Install CLI">
        Install the vextis CLI locally.
      </PageTitle>
      <CommandBlock T={T} command={INSTALL_COMMAND} />
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Check version" command="vextis version" />
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Update to latest" command="vextis update" />
    </>
  );
}
