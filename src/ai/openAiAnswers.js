import OpenAI from 'openai';
import { buildAnswerContext, createAnswerPrompt, validateDraftAnswer } from './applicationAnswers.js';

export async function draftApplicationAnswer({ apiKey, model = 'gpt-4o-mini', question, profile, job }) {
  const context = buildAnswerContext(question, profile, job);
  if (context.classification.requiresReview) {
    return { status: 'needs_review', answer: null, reason: 'Question requires a verified profile fact.' };
  }
  if (!apiKey) return { status: 'needs_review', answer: null, reason: 'OPENAI_API_KEY is not configured.' };

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: createAnswerPrompt(context),
    max_output_tokens: 250,
  });
  const answer = String(response.output_text || '').trim();
  if (answer === 'NEEDS_REVIEW') return { status: 'needs_review', answer: null, reason: 'Model requested review.' };
  const validation = validateDraftAnswer(context, answer);
  return { ...validation, answer: validation.valid ? answer : null };
}
