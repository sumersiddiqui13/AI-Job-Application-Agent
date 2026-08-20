import test from 'node:test';
import assert from 'node:assert/strict';

function canEnterDryRun(application) {
  return application?.status === 'approved' && Boolean(application?.job?.url);
}

test('dry-run requires explicit approval', () => {
  assert.equal(canEnterDryRun({ status: 'prepared', job: { url: 'https://example.com' } }), false);
  assert.equal(canEnterDryRun({ status: 'approved', job: { url: 'https://example.com' } }), true);
});

test('dry-run requires a job URL', () => {
  assert.equal(canEnterDryRun({ status: 'approved', job: {} }), false);
});
