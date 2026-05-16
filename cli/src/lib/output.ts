import process from 'node:process';

export const EXIT = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  NOT_FOUND: 3,
  FORBIDDEN: 4,
  CONFLICT: 5,
} as const;

export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY) && !isCI();
}

export function isCI(): boolean {
  return Boolean(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD
  );
}

export function isColorEnabled(flags?: Record<string, string | boolean>): boolean {
  if (flags?.['no-color']) return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
}

export function isJsonMode(flags: Record<string, string | boolean>): boolean {
  return flags.json === true || flags.json === 'true' || flags.j === true || flags.j === 'true';
}

export function isPlainMode(flags: Record<string, string | boolean>): boolean {
  return flags.plain === true || flags.plain === 'true';
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function printPlain(value: string): void {
  process.stdout.write(value.endsWith('\n') ? value : value + '\n');
}
