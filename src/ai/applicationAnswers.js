import { classifyQuestion } from './questionPolicy.js';

function flattenFacts(profile = {}) {
  const facts = [];
  const push = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((item) => push(key, item));
    else if (typeof value === 'object') Object.entries(value).forEach(([k, v]) => push(`${key}.${k}`, v));
    else facts.push(`${key}: ${value}`);
  };
  Object.entries(profile).forEach(([key, value]) => push(key, value));
  return facts;
}

export function buildAnswerContext(question, profile, job = {}) {
  const classification = classifyQuestion(question);
  return {
    classification,
    question: String(question ?? '').trim(),
    job: {
      title: job.title || '',
      company: job.company || '',
      description: job.description || '',
    },
    verifiedFacts: flattenFacts(profile),
  };
}

export function validateDraftAnswer(context, answer) {
  const text = String(answer ?? '').trim();
  if (!text) return { valid: false, status: 'needs_review', reason: 'Empty answer.' };
  if (context.classification.requiresReview) {
    return { valid: false, status: 'needs_review', reason: 'Question requires a verified profile fact.' };
  }
  const lower = text.toLowerCase();
  const risky = ['i have ', 'i am ', 'my ', 'i worked', 'i led', 'i earned', 'i graduated'];
  const factual = context.verifiedFacts.map((fact) => fact.toLowerCase());
  const hasProfileSupport = risky.some((prefix) => lower.includes(prefix)) && factual.some((fact) => fact.split(':').slice(1).join(':').trim() && lower.includes(fact.split(':').slice(1).join(':').trim().toLowerCase()));
  if (risky.some((prefix) => lower.includes(prefix)) && !hasProfileSupport) {
    return { valid: false, status: 'needs_review', reason: 'Draft contains personal claims not grounded in a verified profile fact.' };
  }
  return { valid: true, status: 'ready' };
}

export function createAnswerPrompt(context) {
  return [
    'You are preparing a job application answer.',
    'Use only the verified facts supplied below. Never invent experience, dates, credentials, authorization, salary history, or employers.',
    'If the question requires a fact that is not supplied, return NEEDS_REVIEW.',
    `Question: ${context.question}`,
    `Job: ${context.job.title} at ${context.job.company}`,
    `Description: ${context.job.description}`,
    `Verified facts:\n${context.verifiedFacts.map((fact) => `- ${fact}`).join('\n')}`,
    'Return only the proposed answer or NEEDS_REVIEW.',
  ].join('\n\n');
}
