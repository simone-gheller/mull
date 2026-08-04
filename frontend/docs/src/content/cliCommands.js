// Kept in sync with cli/src/index.ts's help() text — the CLI's own source of truth for its command surface.
export const CLI_COMMAND_GROUPS = [
  {
    title: 'Auth',
    commands: [
      ['auth login', 'Sign in via browser device flow.'],
      ['auth logout [--all]', 'Sign out. --all clears every linked organization.'],
      ['auth whoami [--json]', 'Show the current session.'],
    ],
  },
  {
    title: 'Organizations',
    commands: [
      ['org list [--json]', 'List organizations in local config.'],
      ['org use <name>', 'Switch the active organization.'],
    ],
  },
  {
    title: 'Context',
    commands: [
      ['context [--json]', 'Show active org, app, and environment.'],
    ],
  },
  {
    title: 'Resources',
    commands: [
      ['app list [--json]', 'List apps.'],
      ['app use <name>', 'Set the active app in .vextis/config.json.'],
      ['env list [--json]', 'List environments.'],
      ['env use <name>', 'Set the active environment in .vextis/config.json.'],
      ['link [--app <name>] [--env <name>]', 'Link this working tree to an app and environment.'],
    ],
  },
  {
    title: 'Parameters',
    commands: [
      ['params list --app <name> [--json]', 'List parameters.'],
      ['params list --app <name> --env <name>', 'List with values (masked on protected environments).'],
      ['params get <key> --app <name> --env <name> [--plain] [--json] [--copy]', 'Get one value.'],
      ['params set <key> --app <name> --env <name>', 'Set a value.'],
    ],
  },
  {
    title: 'Config',
    commands: [
      ['config pull [--app <name>] [--env <name>]', 'Pull resolved config as .env to stdout.'],
      ['config pull --output json', 'Pull resolved config as JSON to stdout.'],
      ['config get <key> [--app <name>] [--env <name>]', 'Get one resolved config value.'],
      ['config set <key> [--app <name>] [--env <name>]', 'Set one resolved config value.'],
    ],
  },
  {
    title: 'Run',
    commands: [
      ['run [--app <name>] [--env <name>] -- <cmd>', 'Inject resolved config into a child process.'],
    ],
  },
  {
    title: 'Utilities',
    commands: [
      ['doctor [--json]', 'Check auth, connectivity, and local project config.'],
      ['version', 'Print the CLI version.'],
      ['update', 'Update to the latest release.'],
      ['help', 'Show CLI help.'],
    ],
  },
];

export const CLI_ENV_VARS = [
  ['VEXTIS_TOKEN', 'Token override — enables CI use without ~/.vextis/config.json.'],
  ['VEXTIS_NO_UPDATE_CHECK=1', 'Skip the daily update check.'],
];
