import { useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { INSTALL_COMMAND } from '../content/quickstart.js';

const YAML = [
  'name: deploy',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '',
  'jobs:',
  '  deploy:',
  '    runs-on: ubuntu-latest',
  '    env:',
  '      VEXTIS_TOKEN: ${{ secrets.VEXTIS_TOKEN }}',
  '    steps:',
  '      - uses: actions/checkout@v4',
  `      - run: ${INSTALL_COMMAND}`,
  '      - run: vextis run --app api --env production -- npm run build',
].join('\n');

export default function CicdPage() {
  const { T } = useOutletContext();

  return (
    <>
      <PageTitle T={T} label="deploy" title="CI/CD">
        Store an organization access key in your CI provider as VEXTIS_TOKEN, then run build or deploy commands through the CLI.
      </PageTitle>
      <CommandBlock T={T} title="GitHub Actions" command={YAML} />
      <div style={{ height: '14px' }} />
      <Callout T={T}>Use organization access keys (vextis_st_*) for CI/CD. Do not use personal tokens (vextis_pat_*) in production automation.</Callout>
    </>
  );
}
