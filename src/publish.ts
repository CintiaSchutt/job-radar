import type { SkillMatch, Verdict } from './filter.ts';
import type { Job } from './types.ts';

export interface Match {
  job: Job;
  verdict: Verdict;
  skills?: SkillMatch;
}

/** The key facts as label/text pairs, shared by the GitHub Issue and the Notion page. */
export function summary({ job, verdict, skills }: Match): [label: string, text: string][] {
  const lines: [string, string][] = [
    ['Score', String(verdict.score)],
    ['Why', verdict.reasons.join('; ')],
    ...verdict.flags.map((flag): [string, string] => ['Check', flag]),
  ];
  if (skills) {
    const total = skills.have.length + skills.missing.length;
    lines.push(['Skills match', `${skills.have.length} of ${total}`]);
    if (skills.have.length) lines.push(['Have', skills.have.join(', ')]);
    if (skills.missing.length) lines.push(['Missing', skills.missing.join(', ')]);
  }
  lines.push(['Source', `${job.source}${job.postedAt ? ` · posted ${job.postedAt.slice(0, 10)}` : ''}`]);
  return lines;
}

/** The Issue text: everything needed to decide in ten seconds, plus the link. */
export function issueBody(match: Match): string {
  const { job } = match;
  const lines = [
    `**${job.company}** · ${job.location || 'location not stated'}`,
    '',
    ...summary(match).map(([label, text]) => `**${label}:** ${text}  `),
    '',
    `**Apply:** ${job.url}`,
    '',
    '<details><summary>Start of the description</summary>',
    '',
    job.description.slice(0, 1200) + (job.description.length > 1200 ? '…' : ''),
    '',
    '</details>',
    '',
    `<!-- job-radar:${job.id} -->`,
  ];
  return lines.join('\n');
}

/**
 * Opens one GitHub Issue per match, using the token GitHub Actions provides.
 * GITHUB_REPOSITORY ("owner/repo") is set automatically in Actions.
 */
export async function publishIssues(matches: Match[]): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY must be set (they are in GitHub Actions)');

  for (const match of matches) {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `${match.job.title} · ${match.job.company}`,
        body: issueBody(match),
        labels: ['job', `score ${match.verdict.score}`],
      }),
    });
    if (!response.ok) throw new Error(`GitHub said ${response.status}: ${await response.text()}`);
  }
}
