import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { OutputBlock } from '../components/content/OutputBlock.jsx';

export default function LoginPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="auth" title="CLI login">
        Authorize your terminal with the browser device flow.
      </PageTitle>
      <CommandBlock T={T} command="vextis auth login" />
      <div style={{ height: '14px' }} />
      <OutputBlock T={T}>{'Authorized as ada@example.com\nActive organization: Acme'}</OutputBlock>
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Verify session" command="vextis auth whoami" />
      <div style={{ height: '14px' }} />
      <CommandBlock T={T} title="Sign out" command="vextis auth logout" />
    </>
  );
}
