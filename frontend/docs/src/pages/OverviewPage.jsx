import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageTitle } from '../components/content/PageTitle.jsx';
import { CommandBlock } from '../components/content/CommandBlock.jsx';
import { Callout } from '../components/content/Callout.jsx';
import { DocCard } from '../components/content/DocCard.jsx';

export default function OverviewPage() {
  const { T } = useOutletContext();
  const navigate = useNavigate();

  return (
    <>
      <PageTitle T={T} label="beta docs" title="vextis documentation">
        Secure app config for local development and CI. Model organizations, apps, environments, and parameters once; read them from the CLI when your code runs.
      </PageTitle>
      <div style={{ display: 'grid', gap: '20px' }}>
        <CommandBlock T={T} title="Start here" command={'vextis auth login\nvextis link\nvextis run --env development -- npm run dev'} />
        <Callout T={T}>
          New to vextis? Create your app, environment, and first parameter in the dashboard. Then use the CLI to link this repository and run your app.
        </Callout>
        <div className="card-grid">
          <DocCard T={T} title="Quickstart" body="The shortest path from empty repo to injected config." onClick={() => navigate('/quickstart')} />
          <DocCard T={T} title="Core concepts" body="Organizations, apps, environments, parameters, and inheritance in one page." onClick={() => navigate('/apps')} />
          <DocCard T={T} title="CI/CD" body="Use an organization token as VEXTIS_TOKEN in automation." onClick={() => navigate('/ci-cd')} />
          <DocCard T={T} title="Security model" body="Encryption, scoped access, and audit trail basics." onClick={() => navigate('/security-model')} />
        </div>
      </div>
    </>
  );
}
