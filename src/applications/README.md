# Submission workflow

Final submission is intentionally a separate, explicit step.

1. Run `npm run final-review` and review the prepared application.
2. The review server records `approved` but keeps `submitBlocked=true`.
3. Only after you have manually reviewed the application, run:

```bash
npm run confirm-submit -- <application-id>
```

4. Copy the one-time confirmation token returned by the command.
5. Run:

```bash
npm run submit -- <application-id> <confirmation-token>
```

The executor refuses to submit unless all gates pass. If the Submit button cannot be located, no click is attempted and the application is recorded as `submission_failed`.

## Important

This is browser automation. Use it only where the relevant job platform permits automation and keep your credentials out of source control. Review the application before each submission.
