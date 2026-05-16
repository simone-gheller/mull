import { clack, GREEN, DIM, fail } from '../lib/ui.ts';
import { loadLocalConfig, saveLocalConfig, localConfigPath } from '../lib/localConfig.ts';

export async function envUseCommand(args: string[]): Promise<void> {
  const envName = args[0];
  if (!envName) {
    fail('Usage: vextis env use <environment>');
  }

  const current = loadLocalConfig();
  if (!current?.project) {
    fail(`No .vextis/config.json found. Run: vextis link`);
  }

  if (envName.toLowerCase() === 'production') {
    process.stderr.write(
      `  ⚠  Switching to production. Changes will affect live traffic.\n`
    );
  }

  saveLocalConfig({ ...current!, env: envName });

  process.stderr.write(
    `  ${GREEN('✓')} env set to ${DIM(envName)} in ${DIM(localConfigPath())}\n`
  );
}
