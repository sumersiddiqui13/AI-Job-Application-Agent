import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestion } from '../src/ai/questionPolicy.js';
import { page } from '../src/review/server.js';

test('factual application questions require review', () => {
  assert.equal(classifyQuestion('How many years of Python experience do you have?').requiresReview, true);
  assert.equal(classifyQuestion('Are you authorized to work in the US?').requiresReview, true);
});

test('non-factual questions are still conservative', () => {
  const result = classifyQuestion('Why are you interested in this role?');
  assert.equal(result.kind, 'general');
  assert.equal(result.requiresReview, false);
});

test('review page reads job details from nested application.job records', () => {
  const html = page([{
    id: 'test-id',
    status: 'prepared',
    matchScore: 80,
    matchReason: 'Target title match: AWS Data Engineer',
    job: {
      title: 'AWS Data Engineer',
      company: 'Capco',
      location: 'Bengaluru',
      url: 'https://example.com/job',
    },
  }]);

  assert.match(html, /AWS Data Engineer/);
  assert.match(html, /Capco/);
  assert.match(html, /Bengaluru/);
  assert.match(html, /80%/);
  assert.match(html, /https:\/\/example\.com\/job/);
  assert.doesNotMatch(html, /Untitled role/);
});
