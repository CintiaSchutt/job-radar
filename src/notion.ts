/**
 * Optional output: adds each match as a row (page) in an existing Notion database, written into
 * that database's own column names (outputs.notion.columns in the profile).
 *
 * Uses Notion API version 2026-03-11, where a database holds one or more "data sources" and rows
 * are created in a data source: https://developers.notion.com/docs/upgrade-guide-2025-09-03
 * Needs NOTION_TOKEN: the secret of an internal integration that has access to that database only.
 */
import { summary, type Match } from './publish.ts';
import type { NotionSettings } from './types.ts';

const API = 'https://api.notion.com/v1';
const VERSION = '2026-03-11';

/** The Notion column type each Job Radar field needs. */
const EXPECTED = {
  company: 'title',
  title: 'rich_text',
  type: 'select',
  stage: 'status',
  posting_url: 'url',
  application_url: 'url',
  score: 'number',
} as const;

/** Company job boards: there the job page is also the application page. */
const COMPANY_BOARDS = new Set(['Greenhouse', 'Lever', 'Ashby']);

export interface NotionTarget {
  dataSourceId: string;
  columns: NotionSettings['columns'];
  /** Option names exactly as spelled in the database. */
  stage?: string;
  types: { remote?: string; hybrid?: string };
}

interface Property {
  type: string;
  select?: { options: { name: string }[] };
  status?: { options: { name: string }[] };
}

async function notion<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN is not set');
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Notion said ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

/** "https://www.notion.so/me/Job-tracker-1a2b…32 hex…?v=…" or a bare id -> the 32-character id. */
export function databaseId(linkOrId: string): string {
  const id = linkOrId.split('?')[0].replace(/-/g, '').match(/[0-9a-f]{32}$/i)?.[0];
  if (!id) throw new Error(`Can't find a Notion database id in "${linkOrId}"`);
  return id;
}

/** Finds an option by name, ignoring upper/lower case, and returns it as the database spells it. */
const option = (property: Property | undefined, name: string) =>
  (property?.select ?? property?.status)?.options.find((o) => o.name.toLowerCase() === name.toLowerCase())?.name;

/**
 * Checks the settings against the real database before anything is written, so a renamed column
 * stops the run with a clear message instead of failing halfway through.
 */
export function checkSchema(settings: NotionSettings, properties: Record<string, Property>, dataSourceId: string): NotionTarget {
  const problems: string[] = [];
  for (const [field, column] of Object.entries(settings.columns)) {
    if (!column) continue;
    const expected = EXPECTED[field as keyof typeof EXPECTED];
    const actual = properties[column]?.type;
    if (!actual) problems.push(`column "${column}" (${field}) not found`);
    else if (actual !== expected) problems.push(`column "${column}" is ${actual}, but ${field} needs ${expected}`);
  }
  const stageColumn = settings.columns.stage ? properties[settings.columns.stage] : undefined;
  const stage = settings.stage_for_new ? option(stageColumn, settings.stage_for_new) : undefined;
  if (settings.stage_for_new && stageColumn && !stage) problems.push(`Stage option "${settings.stage_for_new}" not found`);
  if (problems.length) throw new Error(`Notion settings don't match the database: ${problems.join('; ')}`);

  const typeColumn = settings.columns.type ? properties[settings.columns.type] : undefined;
  return {
    dataSourceId,
    columns: settings.columns,
    stage,
    types: { remote: option(typeColumn, 'remote'), hybrid: option(typeColumn, 'hybrid') },
  };
}

/** Reads the database's columns and checks them. Run once, before publishing. */
export async function connectNotion(settings: NotionSettings): Promise<NotionTarget> {
  const database = await notion<{ data_sources: { id: string }[] }>(`/databases/${databaseId(settings.database)}`);
  const dataSourceId = database.data_sources[0]?.id;
  if (!dataSourceId) throw new Error('This Notion database has no data source');
  const source = await notion<{ properties: Record<string, Property> }>(`/data_sources/${dataSourceId}`);
  return checkSchema(settings, source.properties, dataSourceId);
}

const text = (content: string, url?: string) => [{ type: 'text', text: { content: content.slice(0, 2000), link: url ? { url } : null } }];

/** The row's columns. Fields with no column, or nothing to say, are left out. */
export function properties({ job, verdict }: Match, target: NotionTarget): Record<string, unknown> {
  const { columns } = target;
  const props: Record<string, unknown> = { [columns.company]: { title: text(job.company) } };
  if (columns.title) props[columns.title] = { rich_text: text(job.title) };
  if (columns.stage && target.stage) props[columns.stage] = { status: { name: target.stage } };
  if (columns.posting_url) props[columns.posting_url] = { url: job.url };
  if (columns.application_url && COMPANY_BOARDS.has(job.source)) props[columns.application_url] = { url: job.url };
  if (columns.score) props[columns.score] = { number: verdict.score };
  // Type: only what the posting says clearly. "On-site" can't be told apart from "not mentioned".
  const type = job.remote ? target.types.remote : /\bhybrid\b/i.test(`${job.location} ${job.title}`) ? target.types.hybrid : undefined;
  if (columns.type && type) props[columns.type] = { select: { name: type } };
  return props;
}

/** The page body: the same summary as the GitHub Issue, then the start of the description. */
function body(match: Match) {
  const paragraph = (rich_text: unknown) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text } });
  const { job } = match;
  return [
    paragraph(text(`${job.title} · ${job.location || 'location not stated'}`)),
    ...summary(match).map(([label, value]) => paragraph(text(`${label}: ${value}`))),
    paragraph(text('Open the posting', job.url)),
    { object: 'block', type: 'heading_3', heading_3: { rich_text: text('Start of the description') } },
    paragraph(text(job.description.slice(0, 1200) + (job.description.length > 1200 ? '…' : ''))),
  ];
}

/** True when a row already has this link, for example a job you added by hand. */
async function exists(target: NotionTarget, url: string): Promise<boolean> {
  const urlColumns = [target.columns.posting_url, target.columns.application_url].filter((c): c is string => !!c);
  if (!urlColumns.length) return false;
  const result = await notion<{ results: unknown[] }>(`/data_sources/${target.dataSourceId}/query`, 'POST', {
    filter: { or: urlColumns.map((property) => ({ property, url: { equals: url } })) },
    page_size: 1,
  });
  return result.results.length > 0;
}

/** Adds one row per match, skipping links already in the database. Returns how many were added. */
export async function publishToNotion(target: NotionTarget, matches: Match[]): Promise<number> {
  let added = 0;
  for (const match of matches) {
    if (await exists(target, match.job.url)) continue;
    await notion('/pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: target.dataSourceId },
      properties: properties(match, target),
      children: body(match),
    });
    added++;
    await new Promise((resolve) => setTimeout(resolve, 350)); // Notion allows about 3 requests a second
  }
  return added;
}
