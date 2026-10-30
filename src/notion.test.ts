import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSchema, databaseId, properties } from './notion.ts';
import type { Match } from './publish.ts';
import type { NotionSettings } from './types.ts';

// A database shaped like a typical job tracker.
const schema = {
  Name: { type: 'title' },
  Position: { type: 'rich_text' },
  Type: { type: 'select', select: { options: [{ name: 'On-site' }, { name: 'hybrid' }, { name: 'remote' }] } },
  Stage: { type: 'status', status: { options: [{ name: 'To review' }, { name: 'Interested' }, { name: 'Applied' }] } },
  'Posting URL': { type: 'url' },
  'Application site': { type: 'url' },
};

const settings: NotionSettings = {
  database: 'https://www.notion.so/me/Job-tracker-0123456789abcdef0123456789abcdef?v=fedcba9876543210fedcba9876543210',
  stage_for_new: 'to review',
  columns: {
    company: 'Name',
    title: 'Position',
    type: 'Type',
    stage: 'Stage',
    posting_url: 'Posting URL',
    application_url: 'Application site',
  },
};

const match = (overrides: Partial<Match['job']> = {}): Match => ({
  job: {
    id: 'ashby:acme:1',
    source: 'Ashby',
    title: 'IAM Engineer',
    company: 'Acme',
    location: 'Remote, Canada',
    remote: true,
    url: 'https://jobs.ashbyhq.com/acme/1',
    description: 'Okta and SAML.',
    ...overrides,
  },
  verdict: { keep: true, score: 9, reasons: [], flags: [] },
});

test('reads the database id from a link, ignoring the view id', () => {
  assert.equal(databaseId(settings.database), '0123456789abcdef0123456789abcdef');
});

test('matches option names ignoring case and returns the database spelling', () => {
  const target = checkSchema(settings, schema, 'ds1');
  assert.equal(target.stage, 'To review');
  assert.equal(target.types.remote, 'remote');
});

test('stops with a clear message when a column is missing or has the wrong type', () => {
  assert.throws(() => checkSchema({ ...settings, columns: { ...settings.columns, posting_url: 'Link' } }, schema, 'ds1'), /"Link".*not found/);
  assert.throws(() => checkSchema({ ...settings, columns: { ...settings.columns, title: 'Stage' } }, schema, 'ds1'), /needs rich_text/);
});

test('fills the columns, with Application site only for company job boards', () => {
  const target = checkSchema(settings, schema, 'ds1');
  const board = properties(match(), target);
  assert.deepEqual(board.Type, { select: { name: 'remote' } });
  assert.deepEqual(board.Stage, { status: { name: 'To review' } });
  assert.ok(board['Application site']);

  const adzuna = properties(match({ source: 'Adzuna', remote: false, location: 'Calgary, AB' }), target);
  assert.equal(adzuna['Application site'], undefined);
  assert.equal(adzuna.Type, undefined);
  assert.ok(adzuna['Posting URL']);
});
