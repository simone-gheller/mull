export const INSTALL_COMMAND = 'curl -fsSL https://raw.githubusercontent.com/simone-gheller/vextis/main/cli/scripts/install.sh | bash';

export const QUICKSTART_STEPS = [
  ['Install the CLI', INSTALL_COMMAND, 'vextis 0.1.x installed'],
  ['Sign in', 'vextis auth login', 'Authorized as ada@example.com'],
  ['Create resources', 'Open the dashboard and create app api, environment development, and parameter DATABASE_URL.', 'Ready in dashboard'],
  ['Link repo', 'vextis link', 'Linked api / development'],
  ['Set a value', 'vextis params set DATABASE_URL --app api --env development --value "postgres://localhost:5432/app"', 'DATABASE_URL updated'],
  ['Run app', 'vextis run --app api --env development -- npm run dev', 'Starting npm run dev'],
];

export const CONCEPTS = [
  ['Organizations', 'The root of the resource hierarchy — apps, environments, members, and roles all belong to one organization.'],
  ['Apps', 'An app is a deployable service or project, such as api, web, or worker.'],
  ['Environments', 'An environment is a runtime target, such as development, staging, or production.'],
  ['Parameters', 'A parameter is a named config key. Values are encrypted and stored per environment.'],
  ['Inheritance', 'Unset local values fall back to parent config. Empty values are treated as unset.'],
];
