import type { Job } from '../types.ts';
import { getJson, looksRemote } from './http.ts';

interface Posting {
  id: string;
  text: string;
  hostedUrl: string;
  categories: { location?: string };
  workplaceType?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  createdAt: number;
}

/** Public postings API, no key needed: https://github.com/lever/postings-api */
export async function lever(company: string): Promise<Job[]> {
  const postings = await getJson<Posting[]>(`https://api.lever.co/v0/postings/${company}?mode=json`);
  return postings.map((posting) => ({
    id: `lever:${company}:${posting.id}`,
    source: 'Lever',
    title: posting.text,
    company,
    location: posting.categories.location ?? '',
    remote: posting.workplaceType === 'remote' || looksRemote(posting.categories.location ?? '', posting.text),
    url: posting.hostedUrl,
    description: `${posting.descriptionPlain ?? ''} ${posting.additionalPlain ?? ''}`.trim(),
    postedAt: new Date(posting.createdAt).toISOString(),
  }));
}
