import fs from 'node:fs/promises';
import { collectLinkedInJobs } from '../browser/linkedinCollector.js';
import { ApplicationStore } from '../core/applicationStore.js';
import { explainJobMatch, scoreJob, shouldApply } from '../core/jobMatcher.js';

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function collectAndPrepare({ config, searchConfig }) {
  const profile = await readJson(config.profilePath);
  const store = new ApplicationStore(config.applicationsPath);
  const jobs = await collectLinkedInJobs(config);
  const prepared = [];

  for (const job of jobs) {
    const score = scoreJob(job, profile);
    const eligible = shouldApply(score, searchConfig.minimumMatchScore ?? config.minMatchScore);
    if (!eligible) continue;
    if (await store.hasApplied(job.jobKey)) continue;
    const explanation = explainJobMatch(job, profile);

    const application = await store.add({
      jobKey: job.jobKey,
      source: job.source,
      job,
      matchScore: score,
      matchReason: explanation.summary,
      matchedSkills: explanation.matchedSkills,
      titleMatch: explanation.titleMatch,
      answerDrafts: [],
      approvalRequired: config.requireApproval,
    });
    prepared.push(application);
  }

  return { totalCollected: jobs.length, prepared };
}
