#!/usr/bin/env node
import { loadConfig } from '../config.js';
import { startFinalReviewServer } from '../review/finalReviewServer.js';

const config = loadConfig();
const port = Number(process.env.REVIEW_PORT || 4180);
startFinalReviewServer({ config, port });
console.log(`Final review server: http://127.0.0.1:${port}`);
console.log('Approval does not submit an application. Final submission remains blocked.');
