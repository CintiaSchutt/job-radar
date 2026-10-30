import type { Job, Profile } from '../types.ts';
import { getJson, looksRemote } from './http.ts';

interface Response {
  results: {
    id: string;
    title: string;
    company?: { display_name?: string };
    location?: { display_name?: string };
    redirect_url: string;
    description: string;
    created: string;
  }[];
}

/**
 * Job search API with a free key: https://developer.adzuna.com
 * Reads ADZUNA_APP_ID and ADZUNA_APP_KEY from the environment (GitHub secrets, or .env locally).
 * Adzuna only returns a short snippet of each description, so fewer keywords match than on company boards.
 */
export async function adzuna(settings: NonNullable<Profile['sources']['adzuna']>): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY are not set');

  const jobs: Job[] = [];
  for (const query of settings.queries) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query,
      results_per_page: '50',
      max_days_old: String(settings.max_days_old ?? 3),
      'content-type': 'application/json',
    });
    if (settings.where) params.set('where', settings.where);
    const { results } = await getJson<Response>(
      `https://api.adzuna.com/v1/api/jobs/${settings.country}/search/1?${params}`,
    );
    for (const result of results) {
      const location = result.location?.display_name ?? '';
      jobs.push({
        id: `adzuna:${result.id}`,
        source: 'Adzuna',
        title: result.title.replace(/<[^>]+>/g, ''),
        company: result.company?.display_name ?? 'Unknown company',
        location,
        remote: looksRemote(location, result.title, result.description),
        url: result.redirect_url,
        description: result.description.replace(/<[^>]+>/g, ''),
        postedAt: result.created,
      });
    }
  }
  return jobs;
}
