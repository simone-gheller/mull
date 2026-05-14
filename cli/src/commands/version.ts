import { VERSION } from '../constants.ts';
import pc from 'picocolors';

export function versionCommand(): void {
  console.log(`mull ${pc.green(VERSION)}`);
}
