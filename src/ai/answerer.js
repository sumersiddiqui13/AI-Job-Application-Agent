const SYSTEM_PROMPT = `You are an application-answer assistant. Use ONLY facts present in the supplied profile. Never invent employers, dates, skills, education, certifications, authorization, metrics, or experience. If the question cannot be answered from the profile, return needs_review. Keep answers concise and professional. Return JSON: {"status":"ready"|"needs_review","answer":"..."}.`;

function profileFacts(profile) {
  return JSON.stringify({
    name: profile.name,
    location: profile.location,
    workAuthorization: profile.workAuthorization,
    skills: profile.skills,
    yearsExperience: profile.yearsExperience,
    education: profile.education,
    certifications: profile.certifications,
    experience: profile.experience,
    projects: profile.projects,
  });
}

export async function draftApplicationAnswer({ question, job, profile, apiKey, model = 'gpt-4o-mini', fetchImpl = fetch }) {
  if (!apiKey) return { status: 'needs_review', answer: '', reason: 'OPENAI_API_KEY is not configured.' };
  if (!question?.trim()) return { status: 'needs_review', answer: '', reason: 'Question is empty.' };

  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ question, job: { title: job?.title, company: job?.company, description: job?.description }, profile: JSON.parse(profileFacts(profile)) }) },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) return { status: 'needs_review', answer: '', reason: 'No answer returned.' };

  let result;
  try { result = JSON.parse(raw); } catch { return { status: 'needs_review', answer: '', reason: 'AI returned invalid JSON.' }; }
  if (!['ready', 'needs_review'].includes(result.status) || typeof result.answer !== 'string') {
    return { status: 'needs_review', answer: '', reason: 'AI response failed validation.' };
  }
  return { status: result.status, answer: result.answer.trim(), reason: result.status === 'needs_review' ? 'Answer requires human review.' : undefined };
}
