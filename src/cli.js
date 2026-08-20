import 'dotenv/config';
import fs from 'node:fs/promises';
import { loadConfig } from './config.js';
import { collectAndPrepare } from './jobs/pipeline.js';
import { startReviewServer } from './review/server.js';

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function collect(config) {
  const searchConfig = await readJson(config.searchConfigPath);
  const result = await collectAndPrepare({ config, searchConfig });
  console.log(`Collected jobs: ${result.totalCollected}`);
  console.log(`Prepared applications: ${result.prepared.length}`);
  for (const application of result.prepared) {
    console.log(`- ${application.job.title} | ${application.job.company} | ${application.matchScore}% | ${application.job.url}`);
  }
  console.log('\nNo application is submitted by this command.');
  console.log('Run npm run review to inspect and approve prepared applications.');
}

const config = loadConfig();
const command = process.argv[2] || 'status';

try {
  if (command === 'collect') {
    await collect(config);
  } else if (command === 'review') {
    startReviewServer({ port: config.reviewPort, applicationsPath: config.applicationsPath });
  } else {
    console.log('AI Job Application Agent');
    console.log(`Minimum match score: ${config.minMatchScore}`);
    console.log(`Approval required: ${config.requireApproval}`);
    console.log('Commands: npm run collect | npm run review | npm test');
  }
} catch (error) {
  console.error(`Agent error: ${error.message}`);
  process.exitCode = 1;
}
