/**
 * The daily run: collect -> skip seen -> filter -> publish -> remember.
 *
 *   npm run dry-run   prints what it would publish; changes nothing (checks Notion settings if set)
 *   npm run radar     publishes to the outputs in the profile: GitHub Issues and/or Notion
 */
import { loadProfile } from './config.ts';
import { judge, skillMatch } from './filter.ts';
import { connectNotion, publishToNotion } from './notion.ts';
import { publishIssues, type Match } from './publish.ts';
import { loadSeen, saveSeen } from './seen.ts';
import { collectJobs } from './sources/index.ts';

const dryRun = process.argv.includes('--dry-run');
const profile = loadProfile();
const seen = loadSeen();
const today = new Date().toISOString().slice(0, 10);

const { jobs, problems } = await collectJobs(profile);
console.log(`Collected ${jobs.length} jobs.`);
problems.forEach((problem) => console.warn(`  Skipped ${problem}`));

// The same job can come from two sources (a company board and Adzuna): keep the first.
const unique = new Map<string, (typeof jobs)[number]>();
for (const job of jobs) {
  const key = `${job.company}|${job.title}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
  if (!unique.has(key)) unique.set(key, job);
}
const fresh = [...unique.values()].filter((job) => !seen[job.id]);
console.log(`${fresh.length} not seen before.`);

const judged = fresh.map((job) => ({ job, verdict: judge(job, profile) }));
const matches: Match[] = judged
  .filter((m) => m.verdict.keep)
  .sort((a, b) => b.verdict.score - a.verdict.score)
  .map((m) => ({ ...m, skills: skillMatch(m.job, profile) }));
const publishNow = matches.slice(0, profile.scoring.max_per_day);
const waiting = matches.slice(profile.scoring.max_per_day);

console.log(`${matches.length} match your profile; publishing ${publishNow.length}${waiting.length ? `, ${waiting.length} wait for tomorrow` : ''}.\n`);
for (const { job, verdict, skills } of publishNow) {
  console.log(`  [${verdict.score}] ${job.title} · ${job.company} · ${job.location}`);
  console.log(`       ${verdict.reasons.join('; ')}${verdict.flags.length ? ` · CHECK: ${verdict.flags.join('; ')}` : ''}`);
  if (skills) console.log(`       have: ${skills.have.join(', ') || '-'} · missing: ${skills.missing.join(', ') || '-'}`);
}

const toIssues = profile.outputs?.github_issues ?? true;
const notionSettings = profile.outputs?.notion;
// Connect to Notion before writing anything, so wrong settings stop the run early.
const notion = notionSettings && (!dryRun || process.env.NOTION_TOKEN) ? await connectNotion(notionSettings) : undefined;
if (dryRun && notion) console.log('\nNotion settings match the database.');

if (dryRun) {
  // A sample of what was dropped and why, to help tune the keywords.
  const dropped = judged.filter((m) => !m.verdict.keep);
  console.log(`\nDropped ${dropped.length}. A sample:`);
  for (const { job, verdict } of dropped.slice(0, 15)) console.log(`  - ${job.title} · ${job.company}: ${verdict.dropped}`);
  console.log('\nDry run: nothing published, data/seen.json unchanged.');
} else {
  if (toIssues) {
    await publishIssues(publishNow);
    console.log(`\nOpened ${publishNow.length} Issues.`);
  }
  if (notion) {
    const added = await publishToNotion(notion, publishNow);
    console.log(`\nAdded ${added} rows to Notion${added < publishNow.length ? ` (${publishNow.length - added} were already there)` : ''}.`);
  }
  // Remember everything looked at today, except matches that are waiting for a later day.
  const waitingIds = new Set(waiting.map((m) => m.job.id));
  for (const { job } of judged) if (!waitingIds.has(job.id)) seen[job.id] = today;
  saveSeen(seen);
}
