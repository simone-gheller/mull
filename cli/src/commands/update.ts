import { clack, GREEN, fail } from '../lib/ui.ts';

// TODO: update URL after GitHub repo is renamed to vextis
const INSTALL_URL = 'https://raw.githubusercontent.com/simone-gheller/mull/main/cli/scripts/install.sh';

export async function updateCommand(): Promise<void> {
  clack.intro(GREEN('vextis update'));
  const spinner = clack.spinner();
  spinner.start('Downloading latest version…');
 
  try {
    const proc = Bun.spawn(['bash', '-c', `curl -fsSL ${INSTALL_URL} | bash`], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const text = await new Response(proc.stdout).text();
    const code = await proc.exited;

    if (code !== 0) {
      spinner.stop('Update failed.');
      const err = await new Response(proc.stderr).text();
      fail(err.trim() || 'Install script failed.');
    }

    spinner.stop('Updated.');
    console.log(text.trim());
    clack.outro(GREEN('vextis updated successfully.'));
  } catch {
    spinner.stop('Failed.');
    fail(`Could not run install script. Install manually:\n  curl -fsSL ${INSTALL_URL} | bash`);
  }
}
