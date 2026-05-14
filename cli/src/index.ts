import { checkForUpdates } from './lib/update.ts';
import { loginCommand } from './commands/auth/login.ts';
import { logoutCommand } from './commands/auth/logout.ts';
import { whoamiCommand } from './commands/auth/whoami.ts';
import { versionCommand } from './commands/version.ts';
import { updateCommand } from './commands/update.ts';
import { appsListCommand } from './commands/apps/list.ts';
import { envsListCommand } from './commands/envs/list.ts';
import { paramsListCommand } from './commands/params/list.ts';
import { paramsSetCommand } from './commands/params/set.ts';
import { configPullCommand } from './commands/config/pull.ts';

const args = process.argv.slice(2);
const [cmd, sub, ...rest] = args;

function help(): void {
  console.log(`
  mull — secure config management

  Usage:
    mull auth login       Sign in via browser
    mull auth logout      Sign out (--all to clear all orgs)
    mull auth whoami      Show current session info

    mull apps             List apps in the active org
    mull envs             List environments in the active org

    mull params list --app <name>               List parameters
    mull params list --app <name> --env <name>  List parameters with values
    mull params set <key> --app <name> --env <name>  Set a parameter value

    mull config pull --app <name> --env <name>  Pull config as .env to stdout
    mull config pull --app <name> --env <name> --output .env  Write to file

    mull version          Print CLI version
    mull update           Update to the latest version
    mull help             Show this help

  Examples:
    mull auth login
    mull apps
    mull envs
    mull params list --app myapp --env production
    mull params set DATABASE_URL --app myapp --env production
    mull config pull --app myapp --env production > .env
`);
}

async function main(): Promise<void> {
  const skipUpdateCheck = cmd === 'update' || cmd === 'version' || cmd === '--version' || cmd === '-v';
  if (!skipUpdateCheck) {
    checkForUpdates().catch(() => {});
  }

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    help();
    return;
  }

  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    versionCommand();
    return;
  }

  if (cmd === 'update') {
    await updateCommand();
    return;
  }

  if (cmd === 'auth') {
    if (sub === 'login') { await loginCommand(); return; }
    if (sub === 'logout') { await logoutCommand(rest); return; }
    if (sub === 'whoami') { await whoamiCommand(); return; }
    console.error(`Unknown auth subcommand: ${sub ?? '(none)'}`);
    console.error('Available: login, logout, whoami');
    process.exit(1);
  }

  if (cmd === 'apps') {
    await appsListCommand();
    return;
  }

  if (cmd === 'envs') {
    await envsListCommand();
    return;
  }

  if (cmd === 'params') {
    if (sub === 'list') { await paramsListCommand(rest); return; }
    if (sub === 'set') { await paramsSetCommand(rest); return; }
    console.error(`Unknown params subcommand: ${sub ?? '(none)'}`);
    console.error('Available: list, set');
    process.exit(1);
  }

  if (cmd === 'config') {
    if (sub === 'pull') { await configPullCommand(rest); return; }
    console.error(`Unknown config subcommand: ${sub ?? '(none)'}`);
    console.error('Available: pull');
    process.exit(1);
  }

  console.error(`Unknown command: ${cmd}`);
  console.error('Run "mull help" for usage.');
  process.exit(1);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
