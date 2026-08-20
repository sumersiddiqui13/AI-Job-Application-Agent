import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestion } from '../src/ai/questionPolicy.js';

test('factual application questions require review', () => {
  assert.equal(classifyQuestion('How many years of Python experience do you have?').requiresReview, true);
  assert.equal(classifyQuestion('Are you authorized to work in the US?').requiresReview, true);
});

test('non-factual questions are still conservative', () => {
  const result = classifyQuestion('Why are you interested in this role?');
  assert.equal(result.kind, 'general');
  assert.equal(result.requiresReview, false);
});
