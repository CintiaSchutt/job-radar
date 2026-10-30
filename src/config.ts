import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { Profile } from './types.ts';

/** Reads config/profile.yml (or the path given) and stops with a clear message if it is missing. */
export function loadProfile(path = 'config/profile.yml'): Profile {
  if (!existsSync(path)) {
    throw new Error(
      `${path} not found. Copy config/profile.example.yml to ${path} and fill it in (see README.md, "Set up your copy").`,
    );
  }
  return parse(readFileSync(path, 'utf8')) as Profile;
}
