import type { Job } from '../types.ts';
import { getJson, htmlToText, looksRemote } from './http.ts';

interface Response {
  jobs: { id: number; title: string; absolute_url: string; location: { name: string }; content: string; updated_at: string }[];
}

/** Public job board API, no key needed: https://developers.greenhouse.io/job-board.html */
export async function greenhouse(board: string): Promise<Job[]> {
  const [{ name }, { jobs }] = await Promise.all([
    getJson<{ name: string }>(`https://boards-api.greenhouse.io/v1/boards/${board}`),
    getJson<Response>(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`),
  ]);
  return jobs.map((job) => ({
    id: `greenhouse:${board}:${job.id}`,
    source: 'Greenhouse',
    title: job.title,
    company: name || board,
    location: job.location?.name ?? '',
    remote: looksRemote(job.location?.name ?? '', job.title),
    url: job.absolute_url,
    // Greenhouse escapes the HTML once more, so it is decoded before tags are removed.
    description: htmlToText(job.content ?? ''),
    postedAt: job.updated_at,
  }));
}
