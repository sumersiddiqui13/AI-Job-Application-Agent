import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('browser collection config has safe defaults', () => {
  const config = loadConfig({});
  assert.equal(config.requireApproval, true);
  assert.equal(config.browserHeadless, false);
  assert.equal(config.maxJobPages, 3);
  assert.equal(config.maxJobsToEnrich, 20);
});

test('environment overrides are parsed', () => {
  const config = loadConfig({
    MIN_MATCH_SCORE: '85',
    REQUIRE_APPROVAL: 'true',
    BROWSER_HEADLESS: 'true',
    MAX_JOB_PAGES: '5',
    MAX_JOBS_TO_ENRICH: '10',
    JOB_SEARCH_URL: 'https://example.com/jobs',
  });

  assert.equal(config.minMatchScore, 85);
  assert.equal(config.browserHeadless, true);
  assert.equal(config.maxJobPages, 5);
  assert.equal(config.maxJobsToEnrich, 10);
  assert.equal(config.jobSearchUrl, 'https://example.com/jobs');
});
