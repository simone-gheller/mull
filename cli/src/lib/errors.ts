import process from 'node:process';
import pc from 'picocolors';
import { EXIT } from './output.ts';

let _jsonModeRef = false;
export function setJsonMode(v: boolean): void { _jsonModeRef = v; }

function printError(msg: string, hint?: string): void {
  if (_jsonModeRef) {
    const obj: Record<string, string> = { error: msg };
    if (hint) obj.hint = hint;
    process.stderr.write(JSON.stringify(obj) + '\n');
  } else {
    process.stderr.write(`\n  ${pc.red('✗')}  ${msg}\n`);
    if (hint) process.stderr.write(`  ${pc.dim('›')}  ${hint}\n`);
    process.stderr.write('\n');
  }
}

export function errorExit(msg: string, hint?: string, code: number = EXIT.ERROR): never {
  printError(msg, hint);
  process.exit(code);
}

export function usageError(msg: string): never {
  errorExit(msg, undefined, EXIT.USAGE);
}

export function notFound(resource: string, name: string, hint?: string): never {
  errorExit(
    `${resource} '${name}' not found.`,
    hint ?? `run: vextis ${resource}s`,
    EXIT.NOT_FOUND,
  );
}

export function forbidden(msg: string, hint?: string): never {
  errorExit(msg, hint, EXIT.FORBIDDEN);
}

export function conflictExit(msg: string, hint?: string): never {
  errorExit(msg, hint, EXIT.CONFLICT);
}
