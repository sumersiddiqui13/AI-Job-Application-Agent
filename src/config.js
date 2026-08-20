function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export function loadConfig(env = process.env) {
  return {
    minMatchScore: numberFromEnv('MIN_MATCH_SCORE', 75),
    requireApproval: env.REQUIRE_APPROVAL !== 'false',
    dataDir: env.DATA_DIR || './data',
    profilePath: env.PROFILE_PATH || './data/profile.json',
    applicationsPath: env.APPLICATIONS_PATH || './data/applications.json',
    openAiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}
