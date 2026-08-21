const FACTUAL_PATTERNS = [
  /years? of/i,
  /experience/i,
  /authorized to work/i,
  /sponsorship/i,
  /degree/i,
  /certif/i,
  /salary/i,
  /relocat/i,
];

export function classifyQuestion(question) {
  const text = String(question ?? '').trim();
  if (!text) return { kind: 'unknown', requiresReview: true };
  if (FACTUAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return { kind: 'profile-fact', requiresReview: true };
  }
  return { kind: 'general', requiresReview: false };
}

export function safeAnswer(question, profile = {}) {
  const classification = classifyQuestion(question);
  if (classification.requiresReview) {
    return {
      answer: null,
      status: 'needs_review',
      reason: 'Question requires a verified profile fact.',
    };
  }

  return {
    answer: null,
    status: 'needs_review',
    reason: 'No answer was supplied; do not guess.',
  };
}
