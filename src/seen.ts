import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'data/seen.json';
const KEEP_DAYS = 120;

/** Job ids already looked at, with the date first seen. Saved in the repo so each run remembers the last. */
export type Seen = Record<string, string>;

export function loadSeen(): Seen {
  return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Seen) : {};
}

/** Saves the list, forgetting ids older than KEEP_DAYS so the file stays small. */
export function saveSeen(seen: Seen): void {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  const kept = Object.fromEntries(Object.entries(seen).filter(([, date]) => date >= cutoff).sort());
  writeFileSync(FILE, `${JSON.stringify(kept, null, 2)}\n`);
}
