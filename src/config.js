function numberFromEnv(name, fallback, env = process.env) {
  const value = Number(env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function booleanFromEnv(name, fallback, env = process.env) {
  if (env[name] === undefined) return fallback;
  return env[name].toLowerCase() === 'true';
}

export function loadConfig(env = process.env) {
  return {
    minMatchScore: numberFromEnv('MIN_MATCH_SCORE', 75, env),
    requireApproval: booleanFromEnv('REQUIRE_APPROVAL', true, env),
    dataDir: env.DATA_DIR || './data',
    profilePath: env.PROFILE_PATH || './data/profile.json',
    applicationsPath: env.APPLICATIONS_PATH || './data/applications.json',
    searchConfigPath: env.SEARCH_CONFIG_PATH || './config/search.json',
    openAiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
    jobSearchUrl: env.JOB_SEARCH_URL || 'https://www.linkedin.com/jobs/',
    linkedinUsername: env.LINKEDIN_USERNAME || '',
    linkedinPassword: env.LINKEDIN_PASSWORD || '',
    browserHeadless: booleanFromEnv('BROWSER_HEADLESS', false, env),
    browserUserDataDir: env.BROWSER_USER_DATA_DIR || '',
    maxJobPages: numberFromEnv('MAX_JOB_PAGES', 3, env),
    maxJobsToEnrich: numberFromEnv('MAX_JOBS_TO_ENRICH', 20, env),
    collectionTimeoutMs: numberFromEnv('JOB_COLLECTION_TIMEOUT_MS', 15000, env),
  };
}
