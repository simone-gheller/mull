export const TROUBLESHOOTING = [
  ['vextis command not found', 'Restart your shell or add the install directory to PATH.'],
  ['No active organization', 'Run vextis auth whoami, then sign in again if needed.'],
  ['No app or environment linked', 'Run vextis link from the repository root.'],
  ['Parameter not found', 'Create the parameter in the dashboard first.'],
  ['Permission denied', 'Check role permissions or token scopes. CI usually needs config:read and config:reveal.'],
  ['vextis doctor reports issues', 'Run vextis doctor --json to see structured output for auth, connectivity, and local project config, then fix the first failing check.'],
];
