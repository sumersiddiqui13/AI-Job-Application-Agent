## End-to-end local run

```bash
npm install
npm run collect
npm run review
npm run inspect-form -- <application-id>
npm run final-review
npm run confirm-submit -- <application-id>
npm run submit -- <application-id> <confirmation-token>
```

Do not run `confirm-submit` or `submit` until you have reviewed the actual application and confirmed that the target site permits this automation.
