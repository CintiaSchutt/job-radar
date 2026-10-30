import type { Job, Profile } from '../types.ts';
import { getJson, htmlToText } from './http.ts';

interface Response {
  jobs?: {
    id: number;
    url: string;
    jobTitle: string;
    companyName: string;
    jobGeo: string;
    jobDescription: string;
    pubDate: string;
  }[];
}

/**
 * Remote jobs filtered by country, no key needed: https://jobi.cy/apidocs
 * Their terms ask you to credit Jobicy and link to the original job, which the Issue or
 * Notion page does (the "Source" line and the link).
 */
export async function jobicy(settings: NonNullable<Profile['sources']['jobicy']>): Promise<Job[]> {
  const jobs: Job[] = [];
  for (const tag of settings.queries) {
    const params = new URLSearchParams({ count: '50', geo: settings.geo, tag });
    const response = await getJson<Response>(`https://jobicy.com/api/v2/remote-jobs?${params}`);
    for (const job of response.jobs ?? []) {
      jobs.push({
        id: `jobicy:${job.id}`,
        source: 'Jobicy',
        title: htmlToText(job.jobTitle),
        company: job.companyName,
        location: `Remote (${job.jobGeo.replace(/\s+/g, ' ')})`,
        remote: true,
        url: job.url,
        description: htmlToText(job.jobDescription),
        postedAt: job.pubDate,
      });
    }
  }
  return jobs;
}
