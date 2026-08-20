import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreJob, shouldApply } from '../src/core/jobMatcher.js';
import { canSubmit, approveApplication } from '../src/core/approval.js';
import { validateAnswer } from '../src/ai/answerPolicy.js';

const profile = {
  skills: ['JavaScript', 'Node.js', 'React'],
  targetTitles: ['Software Engineer', 'Backend Developer'],
};

test('scores a relevant job higher than an unrelated job', () => {
  const relevant = scoreJob({ title: 'Software Engineer', description: 'Node.js React JavaScript', requiredSkills: ['Node.js'] }, profile);
  const unrelated = scoreJob({ title: 'Accountant', description: 'tax accounting', requiredSkills: ['CPA'] }, profile);
  assert.ok(relevant > unrelated);
  assert.equal(shouldApply(relevant, 75), true);
  assert.equal(shouldApply(unrelated, 75), false);
});

test('submission requires explicit approval', () => {
  const application = { status: 'prepared' };
  assert.equal(canSubmit(application, { approved: true }), false);
  const approved = approveApplication(application);
  assert.equal(canSubmit(approved, { approved: true }), true);
});

test('answer policy rejects empty answers', () => {
  assert.deepEqual(validateAnswer(''), { ok: false, reason: 'empty_answer' });
});
