export const DOC_GROUPS = [
  {
    title: 'Getting started',
    pages: [
      { path: '/docs', title: 'Overview', description: 'What vextis is and where to start.' },
      { path: '/docs/quickstart', title: 'Quickstart', description: 'Get a local app running with managed config.' },
      { path: '/docs/about', title: 'About vextis', description: 'What vextis is for and who it is built for.' },
    ],
  },
  {
    title: 'Core concepts',
    pages: [
      { path: '/docs/organizations', title: 'Organizations', description: 'The root of every app, environment, and member.' },
      { path: '/docs/apps', title: 'Apps', description: 'Deployable services and projects.' },
      { path: '/docs/environments', title: 'Environments', description: 'Runtime targets like development and production.' },
      { path: '/docs/parameters', title: 'Parameters', description: 'Encrypted config keys and values.' },
      { path: '/docs/inheritance', title: 'Inheritance', description: 'Fallback behavior for unset values.' },
      { path: '/docs/authentication', title: 'Authentication', description: 'JWT sessions, personal tokens, and service tokens.' },
      { path: '/docs/access-tokens', title: 'Tokens', description: 'Personal and organization automation tokens.' },
      { path: '/docs/secrets-visibility', title: 'Secrets & visibility', description: 'Secret-by-default values, reveal scopes, and protected environments.' },
      { path: '/docs/roles-permissions', title: 'Roles', description: 'System roles and the scope model behind them.' },
    ],
  },
  {
    title: 'CLI',
    pages: [
      { path: '/docs/install-cli', title: 'Install CLI', description: 'Install and update the vextis CLI.' },
      { path: '/docs/cli-login', title: 'CLI login', description: 'Authorize your terminal session.' },
      { path: '/docs/cli-reference', title: 'CLI reference', description: 'The full command surface.' },
      { path: '/docs/config-commands', title: 'Config commands', description: 'Pull, get, and set resolved config.' },
      { path: '/docs/linking-a-project', title: 'Linking a project', description: 'Bind a working tree to an app and environment.' },
      { path: '/docs/troubleshooting', title: 'Troubleshooting', description: 'Common setup and permission issues.' },
    ],
  },
  {
    title: 'Automate',
    pages: [
      { path: '/docs/run-with-env', title: 'Run with env', description: 'Inject config into a child process.' },
      { path: '/docs/ci-cd', title: 'CI/CD', description: 'Use VEXTIS_TOKEN in automation.' },
    ],
  },
  {
    title: 'Security & governance',
    pages: [
      { path: '/docs/security-model', title: 'Security model', description: 'Encryption, authorization, and audit posture.' },
      { path: '/docs/audit-logs', title: 'Audit logs', description: 'Events recorded for sensitive actions.' },
    ],
  },
];

export const ALL_PAGES = DOC_GROUPS.flatMap(group => group.pages.map(page => ({ ...page, group: group.title })));

// Guides live under /docs/*, and the full endpoint reference lives under /api/* — a standalone
// page outside this sidebar tree (see ApiReferencePage.jsx), reachable only from the top nav.
// Changelog is likewise its own top-level page (/changelog), outside both trees. Same split
// docs.doppler.com uses between Guides / API Reference / Changelog — there's no "Reference" group
// in this sidebar because the API link in the top nav already covers that ground.

// Every path the site used before the /docs + /api restructure (and pages later merged/removed —
// api-basics folded into authentication, sdks removed), mapped to its current home. Generates a
// <Navigate> route per entry in App.jsx so old links (bookmarks, external references) still work.
export const PATH_REDIRECTS = {
  '/': '/docs',
  '/quickstart': '/docs/quickstart',
  '/install-cli': '/docs/install-cli',
  '/cli-login': '/docs/cli-login',
  '/organizations': '/docs/organizations',
  '/apps': '/docs/apps',
  '/environments': '/docs/environments',
  '/parameters': '/docs/parameters',
  '/inheritance': '/docs/inheritance',
  '/cli-reference': '/docs/cli-reference',
  '/config-commands': '/docs/config-commands',
  '/linking-a-project': '/docs/linking-a-project',
  '/troubleshooting': '/docs/troubleshooting',
  '/run-with-env': '/docs/run-with-env',
  '/ci-cd': '/docs/ci-cd',
  '/access-tokens': '/docs/access-tokens',
  '/security-model': '/docs/security-model',
  '/roles-permissions': '/docs/roles-permissions',
  '/audit-logs': '/docs/audit-logs',
  '/api-basics': '/docs/authentication',
  '/docs/api-basics': '/docs/authentication',
};

// Legacy hash ids (from the pre-router #hash-based site) mapped to their current path, so old
// links (including any cached/bookmarked ones) still resolve after both the router migration and
// the later /docs + /api restructure.
export const LEGACY_HASH_REDIRECTS = {
  overview: '/docs',
  quickstart: '/docs/quickstart',
  'install-cli': '/docs/install-cli',
  'cli-login': '/docs/cli-login',
  apps: '/docs/apps',
  environments: '/docs/environments',
  parameters: '/docs/parameters',
  inheritance: '/docs/inheritance',
  'config-pull': '/docs/config-commands',
  'run-with-env': '/docs/run-with-env',
  'ci-cd': '/docs/ci-cd',
  'security-model': '/docs/security-model',
  'access-tokens': '/docs/access-tokens',
  'audit-logs': '/docs/audit-logs',
  'cli-reference': '/docs/cli-reference',
  'api-basics': '/docs/authentication',
  troubleshooting: '/docs/troubleshooting',
  changelog: '/changelog',
};

export function findPageByPath(path) {
  return ALL_PAGES.find(page => page.path === path);
}
