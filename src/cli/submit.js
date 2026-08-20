#!/usr/bin/env node
import { loadConfig } from '../config.js';
import { submitApprovedApplication } from '../applications/finalSubmit.js';

const applicationId = process.argv[2];
const confirmationToken = process.argv[3];
if (!applicationId || !confirmationToken) {
  console.error('Usage: npm run submit -- <approved-application-id> <confirmation-token>');
  process.exit(1);
}

const result = await submitApprovedApplication({
  config: loadConfig(),
  applicationId,
  confirmationToken,
});
console.log(JSON.stringify(result, null, 2));
