#!/usr/bin/env node
import { loadConfig } from '../config.js';
import { ApplicationStore } from '../core/applicationStore.js';
import { createSubmitConfirmation } from '../applications/submissionGate.js';

const applicationId = process.argv[2];
if (!applicationId) {
  console.error('Usage: npm run confirm-submit -- <approved-application-id>');
  process.exit(1);
}

const store = new ApplicationStore(loadConfig().applicationsPath);
const applications = await store.list();
const application = applications.find((item) => item.id === applicationId);
if (!application) throw new Error(`Application not found: ${applicationId}`);
if (application.status !== 'approved') throw new Error('Only final-review-approved applications can be confirmed.');

const token = createSubmitConfirmation(applicationId);
const updated = await store.updateStatus(applicationId, 'approved', {
  submitBlocked: false,
  finalSubmitConfirmationToken: token,
  finalSubmitConfirmationCreatedAt: new Date().toISOString(),
});

console.log('FINAL SUBMIT CONFIRMATION CREATED.');
console.log(`Application: ${applicationId}`);
console.log('This token is required for the submit command and should be used immediately.');
console.log(token);
console.log(`Status: ${updated.status}`);
