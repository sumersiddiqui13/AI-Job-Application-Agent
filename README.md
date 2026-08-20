# AI Job Application Agent

A safety-first AI-assisted job application agent.

## Current phase

The project now has a browser **job-collection** adapter for LinkedIn. It can collect job cards, enrich a limited number with descriptions, score them against a verified profile, and store qualifying applications as `prepared`.

**It does not submit applications.** Submission remains behind the explicit approval gate and will be added only after the review workflow is in place.

## Setup

Requirements:

- Node.js 20+
- Google Chrome

Install dependencies:

```bash
npm install
```

Create local configuration:

```bash
cp .env.example .env
cp config/search.example.json config/search.json
cp config/profile.example.json data/profile.json
```

Edit `data/profile.json` with your real, verified information. Do not commit it.

Edit `config/search.json` for the roles, locations, work mode, and minimum match score you want.

### Browser login

You can either:

1. Set `LINKEDIN_USERNAME` and `LINKEDIN_PASSWORD` in `.env`, or
2. Leave them empty and use a visible Chrome session/persistent profile.

For local development, option 2 is preferable because credentials do not need to be stored in `.env`.

## Run

Show configuration:

```bash
npm start
```

Collect and score jobs:

```bash
npm run collect
```

Run tests:

```bash
npm test
```

## What `collect` does

```text
LinkedIn search
      ↓
Collect job cards
      ↓
Enrich job descriptions
      ↓
Match against verified profile
      ↓
Skip duplicates / low scores
      ↓
Store qualifying jobs as PREPARED
```

It does **not** click an application submit button.

## Safety

- `REQUIRE_APPROVAL=true` by default.
- The current browser adapter only reads job data.
- Profile data is local and ignored by Git.
- AI answers must use verified profile facts and flag missing information instead of guessing.
- Browser errors should be handled without silently submitting an application.

## Roadmap

1. ~~Core matching and approval foundation~~
2. ~~LinkedIn job collection~~
3. Application preparation + human review UI
4. Verified AI application answers
5. Resume tailoring from verified facts
6. Easy Apply form filling behind approval
7. Screenshot/error recovery
8. Application dashboard and analytics
