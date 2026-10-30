/** One job posting, in the same shape whatever source it came from. */
export interface Job {
  /** Unique across sources, e.g. "greenhouse:okta:8079108". */
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  /** Plain text, HTML removed. */
  description: string;
  /** ISO date, when the source gives one. */
  postedAt?: string;
}

/** The settings in config/profile.yml. */
export interface Profile {
  person: {
    name: string;
    summary: string;
  };
  locations: {
    /** Places you can work on site or hybrid, e.g. Calgary. */
    preferred: string[];
    /** Words in a remote job's location that mean you can apply, e.g. Canada. */
    remote_ok: string[];
  };
  sources: {
    adzuna?: { country: string; queries: string[]; where?: string; max_days_old?: number };
    greenhouse?: string[];
    lever?: string[];
    ashby?: string[];
    remotive?: { queries: string[] };
  };
  keywords: {
    tier1_titles: string[];
    tier2_titles: string[];
    tier3_titles: string[];
    products: string[];
    concepts: string[];
    exclude_titles: string[];
    exclude_phrases: string[];
  };
  scoring: {
    keep_at: number;
    max_per_day: number;
    points: {
      tier1: number;
      tier2: number;
      tier3: number;
      product: number;
      product_max: number;
      concept: number;
      concept_max: number;
      preferred_location: number;
      remote_ok: number;
      remote_unclear: number;
    };
  };
}
