const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function normalized(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(text) {
  return new Set(normalized(text).split(/\s+/).filter(Boolean));
}

function containsTerm(text, term) {
  const value = normalized(term);
  if (!value) return false;
  return text.includes(value);
}

export function scoreJob(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  const profileSkills = (profile.skills ?? []).map(normalized).filter(Boolean);
  const requiredSkills = (job.requiredSkills ?? []).map(normalized).filter(Boolean);
  const matchedSkills = profileSkills.filter((skill) => containsTerm(jobText, skill));
  const matchedRequired = requiredSkills.filter((skill) => containsTerm(jobText, skill));

  const targets = (profile.targetTitles ?? []).map(normalized).filter(Boolean);
  const title = normalized(job.title);
  const exactTitle = targets.some((target) => title === target || title.startsWith(`${target} `));

  let titleScore = exactTitle ? 40 : 0;
  if (!exactTitle && targets.length) {
    const titleTokens = tokenSet(title);
    const bestOverlap = Math.max(...targets.map((target) => {
      const targetTokens = tokenSet(target);
      if (!targetTokens.size) return 0;
      return [...targetTokens].filter((token) => titleTokens.has(token)).length / targetTokens.size;
    }), 0);
    titleScore = Math.round(bestOverlap * 30);
  }

  // Score the skills actually found in the listing, rather than dividing by
  // every skill the candidate has ever used.
  const skillScore = Math.min(50, matchedSkills.length * 8);
  const requiredScore = requiredSkills.length
    ? Math.round((matchedRequired.length / requiredSkills.length) * 10)
    : 0;

  return clamp(titleScore + skillScore + requiredScore);
}

export function explainJobMatch(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  const matched = (profile.skills ?? []).filter((skill) => containsTerm(jobText, skill));
  const title = String(job.title ?? '').toLowerCase();
  const titleMatch = (profile.targetTitles ?? []).find((target) => title.includes(String(target).toLowerCase())) || null;
  return {
    matchedSkills: matched,
    titleMatch,
    summary: [
      matched.length ? `Matched skills: ${matched.slice(0, 6).join(', ')}` : 'No verified skill matches found.',
      titleMatch ? `Target title match: ${titleMatch}` : 'No direct target-title match.',
    ].join(' '),
  };
}

export function shouldApply(score, minimumScore = 75) {
  return Number(score) >= Number(minimumScore);
}
