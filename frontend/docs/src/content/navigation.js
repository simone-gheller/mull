export const DOC_GROUPS = [
  {
    title: 'Start',
    pages: [
      { path: '/', title: 'Overview', description: 'What vextis is and where to start.' },
      { path: '/quickstart', title: 'Quickstart', description: 'Get a local app running with managed config.' },
      { path: '/install-cli', title: 'Install CLI', description: 'Install and update the vextis CLI.' },
      { path: '/cli-login', title: 'CLI login', description: 'Authorize your terminal session.' },
    ],
  },
  {
    title: 'Core concepts',
    pages: [
      { path: '/organizations', title: 'Organizations', description: 'The root of every app, environment, and member.' },
      { path: '/apps', title: 'Apps', description: 'Deployable services and projects.' },
      { path: '/environments', title: 'Environments', description: 'Runtime targets like development and production.' },
      { path: '/parameters', title: 'Parameters', description: 'Encrypted config keys and values.' },
      { path: '/inheritance', title: 'Inheritance', description: 'Fallback behavior for unset values.' },
    ],
  },
  {
    title: 'CLI',
    pages: [
      { path: '/cli-reference', title: 'CLI reference', description: 'The full command surface.' },
      { path: '/config-commands', title: 'Config commands', description: 'Pull, get, and set resolved config.' },
      { path: '/linking-a-project', title: 'Linking a project', description: 'Bind a working tree to an app and environment.' },
      { path: '/troubleshooting', title: 'Troubleshooting', description: 'Common setup and permission issues.' },
    ],
  },
  {
    title: 'Automate',
    pages: [
      { path: '/run-with-env', title: 'Run with env', description: 'Inject config into a child process.' },
      { path: '/ci-cd', title: 'CI/CD', description: 'Use VEXTIS_TOKEN in automation.' },
      { path: '/access-tokens', title: 'Access tokens', description: 'Personal and organization automation tokens.' },
    ],
  },
  {
    title: 'Security & governance',
    pages: [
      { path: '/security-model', title: 'Security model', description: 'Encryption, authorization, and audit posture.' },
      { path: '/roles-permissions', title: 'Roles & permissions', description: 'System roles and the scope model behind them.' },
      { path: '/audit-logs', title: 'Audit logs', description: 'Events recorded for sensitive actions.' },
    ],
  },
  {
    title: 'Reference',
    pages: [
      { path: '/api-basics', title: 'API basics', description: 'Auth model and key endpoints for automation.' },
      { path: '/sdks', title: 'SDKs', description: 'SDKs planned after CLI and API stabilize.', badge: 'soon' },
      { path: '/changelog', title: 'Changelog', description: 'CLI release notes.' },
    ],
  },
];

export const ALL_PAGES = DOC_GROUPS.flatMap(group => group.pages.map(page => ({ ...page, group: group.title })));

// Legacy hash ids (from the pre-router #hash-based site) mapped to their new path,
// so old links (including any cached/bookmarked ones) still resolve.
export const LEGACY_HASH_REDIRECTS = {
  overview: '/',
  quickstart: '/quickstart',
  'install-cli': '/install-cli',
  'cli-login': '/cli-login',
  apps: '/apps',
  environments: '/environments',
  parameters: '/parameters',
  inheritance: '/inheritance',
  'config-pull': '/config-commands',
  'run-with-env': '/run-with-env',
  'ci-cd': '/ci-cd',
  'security-model': '/security-model',
  'access-tokens': '/access-tokens',
  'audit-logs': '/audit-logs',
  'cli-reference': '/cli-reference',
  'api-basics': '/api-basics',
  sdks: '/sdks',
  troubleshooting: '/troubleshooting',
  changelog: '/changelog',
};

export function findPageByPath(path) {
  return ALL_PAGES.find(page => page.path === path);
}
