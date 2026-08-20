import { loadConfig } from './config.js';

const config = loadConfig();

console.log('AI Job Application Agent');
console.log(`Minimum match score: ${config.minMatchScore}`);
console.log(`Approval required: ${config.requireApproval}`);
console.log('Browser submission adapter: not enabled in the foundation build.');
