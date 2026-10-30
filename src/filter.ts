import type { Job, Profile } from './types.ts';

export interface Verdict {
  keep: boolean;
  score: number;
  /** Why it scored what it did, shown in the Issue. */
  reasons: string[];
  /** Things to check by hand, e.g. a remote job with no country. */
  flags: string[];
  /** Why it was dropped, for the dry-run output. */
  dropped?: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word, case-insensitive: "IAM" matches "IAM Analyst" but not "William". */
const has = (text: string, word: string) =>
  new RegExp(`(^|[^a-z0-9])${escape(word)}([^a-z0-9]|$)`, 'i').test(text);

const found = (text: string, words: string[]) => words.filter((word) => has(text, word));

/** A remote job naming one of these (and none of your remote_ok words) is for somewhere else. */
const OTHER_PLACES =
  /\b(us|usa|united states|uk|gb|united kingdom|ireland|europe|emea|apac|latam|ind|india|germany|spain|france|netherlands|poland|mexico|brazil|japan|australia|philippines|singapore)\b/i;

/**
 * Scores one job against the profile. A pure function (same input, same output, no network),
 * so it is easy to test: see filter.test.ts.
 */
export function judge(job: Job, profile: Profile): Verdict {
  const { keywords, locations, scoring } = profile;
  const points = scoring.points;
  const reasons: string[] = [];
  const flags: string[] = [];
  const drop = (why: string): Verdict => ({ keep: false, score: 0, reasons, flags, dropped: why });

  // 1. Exclusions first: no points can save these.
  const badTitle = found(job.title, keywords.exclude_titles);
  if (badTitle.length) return drop(`title has "${badTitle[0]}"`);
  const badPhrase = found(job.description, keywords.exclude_phrases);
  if (badPhrase.length) return drop(`description has "${badPhrase[0]}"`);

  // 2. Location: keep only places you can work.
  let score = 0;
  const place = `${job.location} ${job.remote ? 'remote' : ''}`;
  if (found(job.location, locations.preferred).length) {
    score += points.preferred_location;
    reasons.push(`in ${found(job.location, locations.preferred)[0]}`);
  } else if (job.remote && found(place, locations.remote_ok).length) {
    score += points.remote_ok;
    reasons.push(`remote (${found(place, locations.remote_ok)[0]})`);
  } else if (job.remote && !OTHER_PLACES.test(job.location)) {
    score += points.remote_unclear;
    reasons.push('remote');
    flags.push('Location unclear: check that Canada is allowed');
  } else {
    return drop(`location "${job.location}"`);
  }

  // 3. Title: the highest tier that matches.
  const tiers = [
    { words: keywords.tier1_titles, points: points.tier1, label: 'IAM title' },
    { words: keywords.tier2_titles, points: points.tier2, label: 'related title' },
    { words: keywords.tier3_titles, points: points.tier3, label: 'developer title' },
  ];
  const tier = tiers.find((t) => found(job.title, t.words).length);
  if (tier) {
    score += tier.points;
    reasons.push(`${tier.label} ("${found(job.title, tier.words)[0]}")`);
  }

  // 4. Description: products and concepts, each capped.
  const products = found(job.description, keywords.products);
  const concepts = found(job.description, keywords.concepts);
  score += Math.min(products.length * points.product, points.product_max);
  score += Math.min(concepts.length * points.concept, points.concept_max);
  if (products.length) reasons.push(`products: ${products.join(', ')}`);
  if (concepts.length) reasons.push(`concepts: ${concepts.join(', ')}`);

  // A job must be about your field: a matching title, or at least 3 field words in the description.
  if (!tier && products.length + concepts.length < 3) return drop('title and description not in your field');
  if (score < scoring.keep_at) return drop(`score ${score} is under ${scoring.keep_at}`);

  return { keep: true, score, reasons, flags };
}
