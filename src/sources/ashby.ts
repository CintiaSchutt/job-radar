import type { Job } from '../types.ts';
import { getJson, looksRemote } from './http.ts';

interface Response {
  jobs: {
    id: string;
    title: string;
    location: string;
    secondaryLocations?: { location: string }[];
    isRemote?: boolean;
    jobUrl: string;
    descriptionPlain?: string;
    publishedAt?: string;
  }[];
}

/** Public job board API, no key needed: https://developers.ashbyhq.com/docs/public-job-posting-api */
export async function ashby(board: string): Promise<Job[]> {
  const { jobs } = await getJson<Response>(`https://api.ashbyhq.com/posting-api/job-board/${board}`);
  return jobs.map((job) => {
    const location = [job.location, ...(job.secondaryLocations ?? []).map((l) => l.location)].join(' / ');
    return {
      id: `ashby:${board}:${job.id}`,
      source: 'Ashby',
      title: job.title,
      company: board,
      location,
      remote: job.isRemote === true || looksRemote(location, job.title),
      url: job.jobUrl,
      description: job.descriptionPlain ?? '',
      postedAt: job.publishedAt,
    };
  });
}
