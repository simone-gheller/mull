import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { SmallHeading } from '../components/content/SmallHeading.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';

export default function ConfigCommandsPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="cli" title="Config commands">
        Pull the full resolved config, or read and write a single key at a time.
      </PageTitle>

      <SmallHeading T={T} id="pull">Pull</SmallHeading>
      <CommandBlock T={T} command="vextis config pull --app api --env development" />
      <div style={{ height: '10px' }} />
      <OutputBlock T={T}>DATABASE_URL=postgres://localhost:5432/app</OutputBlock>
      <div style={{ height: '10px' }} />
      <CommandBlock T={T} title="JSON output" command="vextis config pull --app api --env development --output json" />
      <div style={{ height: '14px' }} />
      <Callout T={T} type="warning">Do not redirect production config into a committed .env file.</Callout>

      <div style={{ height: '24px' }} />
      <SmallHeading T={T} id="get">Get a single value</SmallHeading>
      <CommandBlock T={T} command="vextis config get DATABASE_URL --app api --env development" />

      <div style={{ height: '24px' }} />
      <SmallHeading T={T} id="set">Set a single value</SmallHeading>
      <CommandBlock T={T} command="vextis config set DATABASE_URL --app api --env development" />
    </>
  );
}
