import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { printUpdateHint } from './ui.ts';
import { VERSION } from '../constants.ts';

const STATE_PATH = join(homedir(), '.vextis', 'state.json');
const REPO = 'simone-gheller/mull'; // TODO: update after repo rename to vextis
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface State {
  lastUpdateCheck?: string;
}

function loadState(): State {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveState(state: State): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export async function checkForUpdates(): Promise<void> {
  const state = loadState();
  const lastCheck = state.lastUpdateCheck ? new Date(state.lastUpdateCheck).getTime() : 0;
  if (Date.now() - lastCheck < ONE_DAY_MS) return;

  saveState({ ...state, lastUpdateCheck: new Date().toISOString() });

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': `vextis-cli/${VERSION}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;
    const data = await res.json() as { tag_name?: string };
    const latest = data.tag_name?.replace(/^v/, '');
    if (latest && latest !== VERSION) {
      printUpdateHint(VERSION, latest);
    }
  } catch {
    // non-blocking — ignore network errors
  }
}
