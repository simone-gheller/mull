import * as clack from '@clack/prompts';
import pc from 'picocolors';

export { clack, pc };

export const GREEN = pc.green;
export const DIM = pc.dim;
export const BOLD = pc.bold;
export const RED = pc.red;
export const CYAN = pc.cyan;

export function intro(title: string) {
  clack.intro(GREEN(BOLD(title)));
}

export function outro(msg: string) {
  clack.outro(GREEN(msg));
}

export function fail(msg: string): never {
  clack.cancel(RED(msg));
  process.exit(1);
}

export function note(msg: string, title?: string) {
  clack.note(msg, title ? DIM(title) : undefined);
}

export function printUpdateHint(current: string, latest: string) {
  process.stderr.write(
    `\n  ${DIM('update available')} ${RED(current)} → ${GREEN(latest)}  ${DIM('run: vextis update')}\n\n`
  );
}

export function formatTable(rows: [string, string][]): string {
  const maxKey = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `  ${DIM(k.padEnd(maxKey))}  ${v}`).join('\n');
}
