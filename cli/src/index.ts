import { checkForUpdates } from './lib/update.ts';
import { loginCommand } from './commands/auth/login.ts';
import { logoutCommand } from './commands/auth/logout.ts';
import { whoamiCommand } from './commands/auth/whoami.ts';
import { versionCommand } from './commands/version.ts';
import { updateCommand } from './commands/update.ts';
import { appsListCommand } from './commands/apps/list.ts';
import { appListCommand } from './commands/app/list.ts';
import { appUseCommand } from './commands/app/use.ts';
import { envsListCommand } from './commands/envs/list.ts';
import { paramsListCommand } from './commands/params/list.ts';
import { paramsSetCommand } from './commands/params/set.ts';
import { paramsGetCommand } from './commands/params/get.ts';
import { configPullCommand } from './commands/config/pull.ts';
import { configGetCommand } from './commands/config/get.ts';
import { configSetCommand } from './commands/config/set.ts';
import { envUseCommand } from './commands/env.ts';
import { runCommand } from './commands/run.ts';
import { orgListCommand } from './commands/org/list.ts';
import { orgUseCommand } from './commands/org/use.ts';
import { contextCommand } from './commands/context.ts';
import { doctorCommand } from './commands/doctor.ts';
import { linkCommand } from './commands/link.ts';

const args = process.argv.slice(2);
const [cmd, sub, ...rest] = args;

function help(): void {
  process.stdout.write(`
  vextis — secure by default

  Auth
    vextis auth login          Sign in via browser
    vextis auth logout         Sign out (--all to clear all orgs)
    vextis auth whoami         Show current session  [--json]

  Organizations
    vextis org list            List orgs in config  [--json]
    vextis org use <name>      Switch active org

  Context
    vextis context             Show active org / app / env  [--json]

  Resources
    vextis app list            List apps  [--json]
    vextis app use <name>      Set active app in .vextis/config.json
    vextis env list            List environments  [--json]
    vextis env use <name>      Set active environment in .vextis/config.json
    vextis link                Link project interactively (app + env picker)

  Parameters
    vextis params list --app <name>               List parameters  [--json]
    vextis params list --app <name> --env <name>  List with values (masked on protected envs)
    vextis params get <key>   --app <name> --env <name>  Get one value  [--plain] [--json] [--copy]
    vextis params set <key>   --app <name> --env <name>  Set a value

  Config
    vextis config pull [--app <name>] [--env <name>]         Pull as .env to stdout
    vextis config pull --output json                         JSON to stdout

  Run
    vextis run [--app <name>] [--env <name>] -- <cmd>     Inject config into child process

  Utilities
    vextis doctor              Check auth, connectivity, project config  [--json]
    vextis version             Print CLI version
    vextis update              Update to latest release
    vextis help                Show this help

  Environment variables
    VEXTIS_TOKEN               Token override (enables CI without ~/.vextis/config.json)
    VEXTIS_NO_UPDATE_CHECK=1   Skip update check

`);
}

async function main(): Promise<void> {
  const skipUpdateCheck =
    cmd === 'update' ||
    cmd === 'version' ||
    cmd === '--version' ||
    cmd === '-v' ||
    process.env.VEXTIS_NO_UPDATE_CHECK === '1';

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
    if (sub === 'whoami') { await whoamiCommand(rest); return; }
    process.stderr.write(`Unknown auth subcommand: ${sub ?? '(none)'}\nAvailable: login, logout, whoami\n`);
    process.exit(2);
  }

  if (cmd === 'org') {
    if (sub === 'list') { orgListCommand(rest); return; }
    if (sub === 'use') { orgUseCommand(rest); return; }
    process.stderr.write(`Unknown org subcommand: ${sub ?? '(none)'}\nAvailable: list, use\n`);
    process.exit(2);
  }

  // app list | app use — apps kept as alias
  if (cmd === 'app') {
    if (sub === 'list') { await appListCommand(rest); return; }
    if (sub === 'use') { await appUseCommand(rest); return; }
    process.stderr.write(`Unknown app subcommand: ${sub ?? '(none)'}\nAvailable: list, use\n`);
    process.exit(2);
  }
  if (cmd === 'apps') {
    await appsListCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  // env list | env use — envs kept as alias
  if (cmd === 'env') {
    if (sub === 'list') { await envsListCommand(rest); return; }
    if (sub === 'use') { await envUseCommand(rest); return; }
    process.stderr.write(`Unknown env subcommand: ${sub ?? '(none)'}\nAvailable: list, use\n`);
    process.exit(2);
  }
  if (cmd === 'envs') {
    await envsListCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'params') {
    if (sub === 'list') { await paramsListCommand(rest); return; }
    if (sub === 'set') { await paramsSetCommand(rest); return; }
    if (sub === 'get') { await paramsGetCommand(rest); return; }
    process.stderr.write(`Unknown params subcommand: ${sub ?? '(none)'}\nAvailable: list, get, set\n`);
    process.exit(2);
  }

  if (cmd === 'link') {
    await linkCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'context' || cmd === 'ctx') {
    contextCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'doctor') {
    await doctorCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'run') {
    await runCommand([sub, ...rest].filter(Boolean) as string[]);
    return;
  }

  if (cmd === 'config') {
    if (sub === 'pull') { await configPullCommand(rest); return; }
    if (sub === 'get') { await configGetCommand(rest); return; }
    if (sub === 'set') { await configSetCommand(rest); return; }
    process.stderr.write(`Unknown config subcommand: ${sub ?? '(none)'}\nAvailable: pull, get, set\n`);
    process.exit(2);
  }

  process.stderr.write(`Unknown command: ${cmd}\nRun "vextis help" for usage.\n`);
  process.exit(2);
}

main().catch(err => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + '\n');
  process.exit(1);
});
