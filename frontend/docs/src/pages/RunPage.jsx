import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';

export default function RunPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="cli" title="Run with env">
        Start a child process with resolved config injected as environment variables.
      </PageTitle>
      <CommandBlock T={T} command="vextis run --app api --env development -- npm run dev" />
      <div style={{ height: '14px' }} />
      <OutputBlock T={T}>{'Loaded config for api / development\nStarting npm run dev'}</OutputBlock>
    </>
  );
}
