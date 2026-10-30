import type { Job, Profile } from '../types.ts';
import { adzuna } from './adzuna.ts';
import { ashby } from './ashby.ts';
import { greenhouse } from './greenhouse.ts';
import { lever } from './lever.ts';
import { remotive } from './remotive.ts';

/**
 * Runs every source in the profile at the same time. A source that fails (wrong board
 * name, site down, missing key) is reported and skipped, so the others still count.
 */
export async function collectJobs(profile: Profile): Promise<{ jobs: Job[]; problems: string[] }> {
  const { sources } = profile;
  const tasks: { name: string; run: () => Promise<Job[]> }[] = [
    ...(sources.greenhouse ?? []).map((board) => ({ name: `Greenhouse ${board}`, run: () => greenhouse(board) })),
    ...(sources.lever ?? []).map((company) => ({ name: `Lever ${company}`, run: () => lever(company) })),
    ...(sources.ashby ?? []).map((board) => ({ name: `Ashby ${board}`, run: () => ashby(board) })),
  ];
  if (sources.adzuna) tasks.push({ name: 'Adzuna', run: () => adzuna(sources.adzuna!) });
  if (sources.remotive) tasks.push({ name: 'Remotive', run: () => remotive(sources.remotive!) });

  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  const jobs: Job[] = [];
  const problems: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') jobs.push(...result.value);
    else problems.push(`${tasks[index].name}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
  });
  return { jobs, problems };
}
