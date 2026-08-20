import test from 'node:test';
import assert from 'node:assert/strict';
import { draftApplicationAnswer } from '../src/ai/answerer.js';
import { explainJobMatch } from '../src/core/jobMatcher.js';

test('match explanation exposes verified skill matches', () => {
  const result = explainJobMatch(
    { title: 'Backend Engineer', description: 'Build Node.js services with AWS.' },
    { skills: ['Node.js', 'AWS', 'React'], targetTitles: ['Backend Engineer'] },
  );
  assert.deepEqual(result.matchedSkills, ['Node.js', 'AWS']);
  assert.equal(result.titleMatch, 'Backend Engineer');
});

test('AI answerer refuses to guess without an API key', async () => {
  const result = await draftApplicationAnswer({ question: 'What is your salary?', job: {}, profile: {}, apiKey: '' });
  assert.equal(result.status, 'needs_review');
});

test('AI answerer validates returned JSON', async () => {
  const fakeFetch = async () => ({ ok: true, async json() { return { choices: [{ message: { content: JSON.stringify({ status: 'ready', answer: 'I have relevant experience.' }) } }] }; } });
  const result = await draftApplicationAnswer({ question: 'Why this role?', job: { title: 'Engineer' }, profile: { skills: ['Node.js'] }, apiKey: 'test', fetchImpl: fakeFetch });
  assert.equal(result.status, 'ready');
  assert.equal(result.answer, 'I have relevant experience.');
});
