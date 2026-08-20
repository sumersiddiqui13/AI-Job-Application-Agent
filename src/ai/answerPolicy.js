const forbiddenPatterns = [
  /invent/i,
  /fabricat/i,
  /make up/i,
  /pretend/i,
];

export function buildAnswerPolicy(profile) {
  const facts = JSON.stringify(profile ?? {});
  return [
    'Answer application questions using only verified facts from the supplied profile.',
    'Never invent experience, education, certifications, employers, dates, skills, salary, or work authorization.',
    'If the profile does not contain enough information, return needs_review instead of guessing.',
    `Verified profile facts: ${facts}`,
  ].join('\n');
}

export function validateAnswer(answer = '') {
  if (!answer.trim()) return { ok: false, reason: 'empty_answer' };
  if (forbiddenPatterns.some((pattern) => pattern.test(answer))) {
    return { ok: false, reason: 'unsafe_generation_instruction' };
  }
  return { ok: true };
}
