import 'dotenv/config';
import fs from 'node:fs/promises';
import { loadConfig } from './config.js';
import { collectAndPrepare } from './jobs/pipeline.js';
import { startReviewServer } from './review/server.js';
import { prepareApprovedApplication } from './applications/easyApplyDryRun.js';

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function collect(config) {
  const searchConfig = await readJson(config.searchConfigPath);
  const result = await collectAndPrepare({ config, searchConfig });
  console.log(`Collected jobs: ${result.totalCollected}`);
  console.log(`Prepared applications: ${result.prepared.length}`);
  for (const item of result.scores) {
    console.log(`Score: ${item.score}% | ${item.title} | ${item.company}`);
  }
  for (const application of result.prepared) {
    console.log(`- ${application.job.title} | ${application.job.company} | ${application.matchScore}% | ${application.job.url}`);
  }
  console.log('\nNo application is submitted by this command.');
  console.log('Run npm run review to inspect and approve prepared applications.');
}

async function dryRun(config, applicationId) {
  if (!applicationId) throw new Error('Usage: npm run dry-run -- <approved-application-id>');
  const result = await prepareApprovedApplication({ config, applicationId });
  console.log(`Dry-run status: ${result.status}`);
  console.log(`Filled known fields: ${result.filledFields ?? 0}`);
  if (result.screenshotPath) console.log(`Screenshot: ${result.screenshotPath}`);
  console.log('Final submission is blocked in this phase.');
}

const config = loadConfig();
const command = process.argv[2] || 'status';

try {
  if (command === 'collect') {
    await collect(config);
  } else if (command === 'review') {
    startReviewServer({ port: config.reviewPort, applicationsPath: config.applicationsPath });
  } else if (command === 'dry-run') {
    await dryRun(config, process.argv[3]);
  } else {
    console.log('AI Job Application Agent');
    console.log(`Minimum match score: ${config.minMatchScore}`);
    console.log(`Approval required: ${config.requireApproval}`);
    console.log('Commands: npm run collect | npm run review | npm run dry-run -- <application-id> | npm test');
  }
} catch (error) {
  console.error(`Agent error: ${error.message}`);
  process.exitCode = 1;
}
