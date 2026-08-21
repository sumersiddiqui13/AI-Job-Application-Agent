export function canSubmit(application, confirmationToken) {
  if (!application) return { ok: false, reason: 'Application not found.' };
  if (application.status !== 'approved') return { ok: false, reason: 'Application has not received final review approval.' };
  if (application.submitBlocked !== false) return { ok: false, reason: 'Submission is blocked until the application explicitly enables submission.' };
  if (!confirmationToken || confirmationToken !== application.finalSubmitConfirmationToken) {
    return { ok: false, reason: 'A fresh final-submit confirmation is required.' };
  }
  return { ok: true };
}

export function createSubmitConfirmation(applicationId) {
  if (!applicationId) throw new Error('Application ID is required.');
  return `${applicationId}:${Date.now()}`;
}
