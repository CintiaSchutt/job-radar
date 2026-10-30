import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadProfile } from './config.ts';
import { judge } from './filter.ts';
import type { Job } from './types.ts';

const profile = loadProfile('config/profile.example.yml');

const job = (overrides: Partial<Job>): Job => ({
  id: 'test:1',
  source: 'Test',
  title: 'IAM Analyst',
  company: 'Acme',
  location: 'Calgary, AB',
  remote: false,
  url: 'https://example.com/job',
  description: 'You will manage Okta and Entra ID, SAML and OIDC integrations.',
  ...overrides,
});

test('keeps an IAM job in Calgary', () => {
  const verdict = judge(job({}), profile);
  assert.equal(verdict.keep, true);
  assert.ok(verdict.score >= profile.scoring.keep_at);
});

test('keeps a developer job when the description is about identity', () => {
  assert.equal(judge(job({ title: 'Software Developer' }), profile).keep, true);
});

test('drops a developer job with nothing about identity', () => {
  const verdict = judge(job({ title: 'Software Developer', description: 'React and Node.js.' }), profile);
  assert.equal(verdict.keep, false);
});

test('drops excluded titles', () => {
  assert.equal(judge(job({ title: 'IAM Manager' }), profile).keep, false);
});

test('drops jobs outside your places', () => {
  assert.equal(judge(job({ location: 'Toronto, ON' }), profile).keep, false);
  assert.equal(judge(job({ location: 'Remote - US', remote: true }), profile).keep, false);
  assert.equal(judge(job({ location: 'IND-Remote', remote: true }), profile).keep, false);
});

test('keeps remote Canada, and flags remote jobs with no country', () => {
  assert.equal(judge(job({ location: 'Remote, Canada', remote: true }), profile).keep, true);
  const unclear = judge(job({ location: 'Remote', remote: true }), profile);
  assert.equal(unclear.keep, true);
  assert.equal(unclear.flags.length, 1);
});

test('matches short words only as whole words', () => {
  const verdict = judge(job({ title: 'William Analyst', description: 'Accounting.' }), profile);
  assert.equal(verdict.keep, false);
});
