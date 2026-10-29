import { callQueueRpc } from './errors';

export async function claimStaffInvitations() {
  return callQueueRpc('claim_staff_invitations', {});
}

export async function sendStaffInviteLink(email) {
  void email;
  throw new Error('Staff invitation delivery is unavailable until an invitation API route is provided.');
}
