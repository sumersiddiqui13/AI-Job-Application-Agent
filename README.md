# AI Job Application Agent

A safety-first AI-assisted job application agent.

## MVP goals

- Configurable job search criteria
- Job fit scoring
- Duplicate application prevention
- Persistent application tracking
- AI-assisted application answers using verified profile facts
- Human approval before submission
- Browser automation behind explicit approval
- Safe environment configuration
- Tests and structured logging

## Safety default

Applications are **not submitted automatically**. The MVP prepares an application and requires explicit approval before the final submission step.

The AI layer must not invent qualifications, experience, education, certifications, or other facts. If the available profile data is insufficient, the answer should be flagged for review.

## Setup

```bash
npm install
cp .env.example .env
npm test
npm start
```

## Project status

Initial repository bootstrap. Browser/job-source adapters will be added after the core domain and tracking layers are in place.
