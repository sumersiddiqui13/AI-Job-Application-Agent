const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function normalized(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ');
}

function tokenSet(text) {
  return new Set(normalized(text).split(/\s+/).filter(Boolean));
}

/**
 * Score a job against verified profile data.
 * This is intentionally deterministic; an AI semantic scorer can be added later.
 */
export function scoreJob(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  const profileSkills = (profile.skills ?? []).map(normalized).filter(Boolean);
  const requiredSkills = (job.requiredSkills ?? []).map(normalized).filter(Boolean);

  const matchedRequired = requiredSkills.filter((skill) => jobText.includes(skill));
  const skillMatches = profileSkills.filter((skill) => jobText.includes(skill));

  const skillScore = profileSkills.length
    ? (skillMatches.length / profileSkills.length) * 55
    : 0;
  const requiredScore = requiredSkills.length
    ? (matchedRequired.length / requiredSkills.length) * 35
    : 35;

  const titleTokens = tokenSet(job.title);
  const targetTokens = new Set((profile.targetTitles ?? []).flatMap((x) => [...tokenSet(x)]));
  const titleOverlap = [...titleTokens].filter((x) => targetTokens.has(x)).length;
  const titleScore = targetTokens.size ? Math.min(10, (titleOverlap / Math.min(4, targetTokens.size)) * 10) : 0;

  return clamp(skillScore + requiredScore + titleScore);
}

export function shouldApply(score, minimumScore = 75) {
  return Number(score) >= Number(minimumScore);
}
