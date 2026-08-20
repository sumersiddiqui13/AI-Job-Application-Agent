#!/usr/bin/env node
import { loadConfig } from '../config.js';
import { inspectApprovedApplication } from '../applications/formRun.js';

const applicationId = process.argv[2];
if (!applicationId) {
  console.error('Usage: npm run inspect-form -- <approved-application-id>');
  process.exit(1);
}

const result = await inspectApprovedApplication({ config: loadConfig(), applicationId });
console.log(JSON.stringify({
  id: result.id,
  status: result.status,
  fields: result.formFields?.length ?? 0,
  screenshotPath: result.screenshotPath,
  submitBlocked: result.submitBlocked === true,
}, null, 2));
