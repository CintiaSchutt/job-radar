import type { Job, Profile } from '../types.ts';
import { getJson, htmlToText } from './http.ts';

interface Response {
  jobs: {
    id: number;
    url: string;
    title: string;
    company_name: string;
    candidate_required_location: string;
    description: string;
    publication_date: string;
  }[];
}

/**
 * Remote jobs, no key needed: https://remotive.com/remote-jobs/api
 * Their terms ask you to link back to the Remotive page and name Remotive as the source,
 * which the Issue does (the link and the "Source" line).
 */
export async function remotive(settings: NonNullable<Profile['sources']['remotive']>): Promise<Job[]> {
  const jobs: Job[] = [];
  for (const query of settings.queries) {
    const response = await getJson<Response>(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`,
    );
    for (const job of response.jobs) {
      jobs.push({
        id: `remotive:${job.id}`,
        source: 'Remotive',
        title: job.title,
        company: job.company_name,
        location: `Remote (${job.candidate_required_location || 'location not stated'})`,
        remote: true,
        url: job.url,
        description: htmlToText(job.description),
        postedAt: job.publication_date,
      });
    }
  }
  return jobs;
}
