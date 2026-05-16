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
import { configGetCommand } from './commands/config/get.ts';
import { configSetCommand } from './commands/config/set.ts';
import { envUseCommand } from './commands/env.ts';
import { runCommand } from './commands/run.ts';

const args = process.argv.slice(2);
const [cmd, sub, ...rest] = args;

function help(): void {
  console.log(`
  vextis — secure by default

  Usage:
    vextis auth login       Sign in via browser
    vextis auth logout      Sign out (--all to clear all orgs)
    vextis auth whoami      Show current session info

    vextis apps             List apps in the active org
    vextis envs             List environments in the active org

    vextis env use <name>   Switch active environment in .vextis/config.json

    vextis run [--app x] [--env y] -- <cmd>  Inject config into child process env

    vextis params list --app <name>               List parameters
    vextis params list --app <name> --env <name>  List parameters with values
    vextis params set <key> --app <name> --env <name>  Set a parameter value

    vextis config pull --app <name> --env <name>  Pull config as .env to stdout
    vextis config pull --app <name> --env <name> --output .env  Write to file
    vextis config get <key> --app <name> --env <name>  Print one value
    vextis config set <key> <value> --app <name> --env <name>  Update a value

    vextis version          Print CLI version
    vextis update           Update to the latest version
    vextis help             Show this help

  Examples:
    vextis auth login
    vextis apps
    vextis env use production
    vextis run --app myapp --env staging -- npm run dev
    vextis config get LOG_LEVEL --app myapp --env production
    vextis config set LOG_LEVEL debug --app myapp --env production
    vextis config pull --app myapp --env production > .env
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

  if (cmd === 'env') {
    if (sub === 'use') { await envUseCommand(rest); return; }
    console.error(`Unknown env subcommand: ${sub ?? '(none)'}`);
    console.error('Available: use');
    process.exit(1);
  }

  if (cmd === 'run') {
    // rest includes sub and everything after: reassemble [sub, ...rest] then prepend back
    await runCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'config') {
    if (sub === 'pull') { await configPullCommand(rest); return; }
    if (sub === 'get') { await configGetCommand(rest); return; }
    if (sub === 'set') { await configSetCommand(rest); return; }
    console.error(`Unknown config subcommand: ${sub ?? '(none)'}`);
    console.error('Available: pull, get, set');
    process.exit(1);
  }

  console.error(`Unknown command: ${cmd}`);
  console.error('Run "vextis help" for usage.');
  process.exit(1);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
