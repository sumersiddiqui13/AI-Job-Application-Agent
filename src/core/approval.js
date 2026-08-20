/**
 * Final submission is intentionally gated behind an explicit approval.
 * Browser adapters should call canSubmit() immediately before clicking submit.
 */
export function canSubmit(application, approval) {
  if (!approval || approval.approved !== true) return false;
  if (application.status !== 'approved') return false;
  return true;
}

export function approveApplication(application) {
  return {
    ...application,
    status: 'approved',
    approvedAt: new Date().toISOString(),
  };
}
