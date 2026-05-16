const SHORT_ALIASES: Record<string, string> = {
  j: 'json',
  o: 'output',
  v: 'verbose',
};

export function parseFlags(args: string[]): { flags: Record<string, string | boolean>; positional: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val === 'true' ? true : val === 'false' ? false : val;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[arg.slice(2)] = args[i + 1];
        i++;
      } else {
        flags[arg.slice(2)] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const short = arg.slice(1);
      const long = SHORT_ALIASES[short] ?? short;
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[long] = args[i + 1];
        i++;
      } else {
        flags[long] = true;
      }
    } else {
      positional.push(arg);
    }
    i++;
  }
  return { flags, positional };
}
