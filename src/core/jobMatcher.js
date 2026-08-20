const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function normalized(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(text) {
  return new Set(normalized(text).split(/\s+/).filter(Boolean));
}

function matchedSkills(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  return (profile.skills ?? []).filter((skill) => jobText.includes(normalized(skill)));
}

export function scoreJob(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  const profileSkills = (profile.skills ?? []).map(normalized).filter(Boolean);
  const requiredSkills = (job.requiredSkills ?? []).map(normalized).filter(Boolean);
  const matchedRequired = requiredSkills.filter((skill) => jobText.includes(skill));
  const skillMatches = profileSkills.filter((skill) => jobText.includes(skill));

  const title = normalized(job.title);
  const targets = (profile.targetTitles ?? []).map(normalized).filter(Boolean);
  const exactTitle = targets.some((target) => title === target);

  // A configured target title is itself strong evidence of relevance. This is
  // important when LinkedIn only exposes the search-card title and the full
  // description cannot be enriched.
  let titleScore = exactTitle ? 75 : 0;
  if (!exactTitle && targets.length) {
    const titleTokens = tokenSet(title);
    const bestOverlap = Math.max(...targets.map((target) => {
      const targetTokens = tokenSet(target);
      if (!targetTokens.size) return 0;
      return [...targetTokens].filter((token) => titleTokens.has(token)).length / targetTokens.size;
    }), 0);
    titleScore = Math.round(bestOverlap * 45);
  }

  // Reward skills that are actually visible in the job data without dividing
  // by the candidate's entire historical skill inventory.
  const skillScore = Math.min(25, skillMatches.length * 5);
  const requiredScore = requiredSkills.length
    ? Math.round((matchedRequired.length / requiredSkills.length) * 10)
    : 0;

  return clamp(titleScore + skillScore + requiredScore);
}

export function explainJobMatch(job, profile) {
  const skills = matchedSkills(job, profile);
  const targets = profile.targetTitles ?? [];
  const title = String(job.title ?? '').toLowerCase();
  const titleMatch = targets.find((target) => title === String(target).toLowerCase());
  return {
    matchedSkills: skills,
    titleMatch: titleMatch || null,
    summary: [
      skills.length ? `Matched skills: ${skills.slice(0, 6).join(', ')}` : 'No verified skill matches found.',
      titleMatch ? `Target title match: ${titleMatch}` : 'No direct target-title match.',
    ].join(' '),
  };
}

export function shouldApply(score, minimumScore = 75) {
  return Number(score) >= Number(minimumScore);
}
