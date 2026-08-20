const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function normalized(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(text, term) {
  const value = normalized(term);
  if (!value) return false;
  const pattern = `(^|\\s)${escapeRegExp(value)}(?=\\s|$)`;
  return new RegExp(pattern).test(text);
}

function tokenSet(text) {
  return new Set(normalized(text).split(/\s+/).filter(Boolean));
}

/**
 * Score a job against verified profile data.
 *
 * The score deliberately rewards strong title alignment and repeated evidence
 * of the candidate's skills instead of granting a large default score when a
 * listing has no structured requiredSkills field. This keeps sparse LinkedIn
 * cards from looking like strong matches while still allowing detailed JDs to
 * reach the approval threshold.
 */
export function scoreJob(job, profile) {
  const jobText = normalized(`${job.title ?? ''} ${job.description ?? ''} ${(job.skills ?? []).join(' ')}`);
  const profileSkills = (profile.skills ?? []).map(normalized).filter(Boolean);
  const requiredSkills = (job.requiredSkills ?? []).map(normalized).filter(Boolean);

  const matchedRequired = requiredSkills.filter((skill) => containsTerm(jobText, skill));
  const skillMatches = profileSkills.filter((skill) => containsTerm(jobText, skill));

  // Up to 50 points: each verified profile skill found in the JD contributes
  // strong evidence, capped so a long JD cannot overwhelm title relevance.
  const skillScore = Math.min(50, skillMatches.length * 15);

  // Only award required-skill points when the listing actually exposes a
  // requiredSkills field. Missing structured data is not evidence of a match.
  const requiredScore = requiredSkills.length
    ? (matchedRequired.length / requiredSkills.length) * 15
    : 0;

  const title = normalized(job.title);
  const targets = (profile.targetTitles ?? []).map(normalized).filter(Boolean);
  const exactTitle = targets.some((target) => title === target || title.startsWith(`${target} `));

  let titleScore = 0;
  if (exactTitle) {
    titleScore = 35;
  } else if (targets.length) {
    const titleTokens = tokenSet(title);
    const bestOverlap = Math.max(...targets.map((target) => {
      const targetTokens = tokenSet(target);
      if (!targetTokens.size) return 0;
      const overlap = [...targetTokens].filter((token) => titleTokens.has(token)).length;
      return overlap / targetTokens.size;
    }), 0);
    titleScore = Math.min(25, bestOverlap * 25);
  }

  return clamp(skillScore + requiredScore + titleScore);
}

export function shouldApply(score, minimumScore = 75) {
  return Number(score) >= Number(minimumScore);
}
