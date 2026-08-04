import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';

export default function ChangelogPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="reference" title="Changelog">
        The CLI is released from GitHub tags — release notes live on GitHub, not duplicated here.
      </PageTitle>
      <Callout T={T}>
        Every <code>cli/v*</code> tag builds macOS, Linux, and Windows binaries and publishes a GitHub Release with auto-generated notes. See the repository's Releases page for the full history.
      </Callout>
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Check your version" command="vextis version" />
      <div style={{ height: '10px' }} />
      <CommandBlock T={T} title="Update to latest" command="vextis update" />
    </>
  );
}
