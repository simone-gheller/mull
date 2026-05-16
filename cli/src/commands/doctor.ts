import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { GREEN, DIM, AMBER, RED, formatTable } from '../lib/ui.ts';
import { loadConfig, activeToken } from '../lib/config.ts';
import { parseFlags } from '../lib/flags.ts';
import { isJsonMode, printJson } from '../lib/output.ts';
import { loadLocalConfig } from '../lib/localConfig.ts';

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
  hint?: string;
}

export async function doctorCommand(args: string[] = []): Promise<void> {
  const { flags } = parseFlags(args);
  const results: CheckResult[] = [];

  // 1. Config file exists and has correct permissions
  const configPath = join(homedir(), '.vextis', 'config.json');
  if (existsSync(configPath)) {
    try {
      const stat = statSync(configPath);
      const mode = (stat.mode & 0o777).toString(8);
      const isSecure = mode === '600';
      results.push({
        label: 'auth config',
        ok: isSecure,
        detail: `${configPath} (${mode})`,
        hint: isSecure ? undefined : `run: chmod 600 ${configPath}`,
      });
    } catch {
      results.push({ label: 'auth config', ok: false, detail: 'cannot read config file', hint: `check permissions on ${configPath}` });
    }
  } else {
    results.push({ label: 'auth config', ok: false, detail: 'not found', hint: 'run: vextis auth login' });
  }

  // 2. Active org + token present
  const cfg = loadConfig();
  if (cfg && cfg.activeOrgId && cfg.orgs[cfg.activeOrgId]) {
    const orgName = cfg.orgs[cfg.activeOrgId].name;
    results.push({ label: 'active org', ok: true, detail: orgName });
  } else if (cfg && Object.keys(cfg.orgs).length > 0) {
    results.push({ label: 'active org', ok: false, detail: 'activeOrgId missing or invalid', hint: 'run: vextis org use <name>' });
  } else {
    results.push({ label: 'active org', ok: false, detail: 'not logged in', hint: 'run: vextis auth login' });
  }

  // 3. API reachable + token valid
  const token = cfg ? activeToken(cfg) : null;
  const apiUrl = cfg?.apiUrl ?? 'https://api.vextis.io';
  if (token) {
    const start = Date.now();
    try {
      const res = await fetch(`${apiUrl}/auth/whoami`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      const ms = Date.now() - start;
      if (res.ok) {
        results.push({ label: 'api reachable', ok: true, detail: `${apiUrl} (${ms}ms)` });
        results.push({ label: 'token valid', ok: true, detail: `200 OK` });
      } else if (res.status === 401) {
        results.push({ label: 'api reachable', ok: true, detail: `${apiUrl} (${ms}ms)` });
        results.push({ label: 'token valid', ok: false, detail: `401 — expired or revoked`, hint: 'run: vextis auth login' });
      } else {
        results.push({ label: 'api reachable', ok: true, detail: `${apiUrl} (${ms}ms)` });
        results.push({ label: 'token valid', ok: false, detail: `HTTP ${res.status}` });
      }
    } catch {
      results.push({ label: 'api reachable', ok: false, detail: `could not reach ${apiUrl}`, hint: 'check your network connection' });
      results.push({ label: 'token valid', ok: false, detail: 'skipped (api unreachable)' });
    }
  } else {
    results.push({ label: 'api reachable', ok: false, detail: 'skipped (no token)', hint: 'run: vextis auth login' });
    results.push({ label: 'token valid', ok: false, detail: 'skipped (no token)' });
  }

  // 4. Project-level config
  const localCfg = loadLocalConfig();
  if (localCfg) {
    results.push({
      label: 'project config',
      ok: true,
      detail: `.vextis/config.json  →  ${localCfg.project} · ${localCfg.env}`,
    });
  } else {
    results.push({
      label: 'project config',
      ok: false,
      detail: '.vextis/config.json not found',
      hint: 'run: vextis link',
    });
  }

  const allOk = results.every(r => r.ok);

  if (isJsonMode(flags)) {
    printJson(results.map(r => ({ check: r.label, ok: r.ok, detail: r.detail, hint: r.hint ?? null })));
    if (!allOk) process.exit(1);
    return;
  }

  process.stderr.write('\n');
  for (const r of results) {
    const icon = r.ok ? GREEN('✓') : RED('✗');
    const labelPadded = r.label.padEnd(16);
    process.stderr.write(`  ${icon}  ${DIM(labelPadded)}  ${r.detail}\n`);
    if (!r.ok && r.hint) {
      process.stderr.write(`     ${' '.repeat(labelPadded.length)}  ${AMBER('→')} ${DIM(r.hint)}\n`);
    }
  }
  process.stderr.write('\n');
  if (!allOk) process.exit(1);
}
