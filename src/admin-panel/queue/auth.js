import { callQueueRpc, requireSupabase } from './errors';

export async function claimStaffInvitations() {
  return callQueueRpc('claim_staff_invitations', {});
}

export async function sendStaffInviteLink(email) {
  const client = requireSupabase();
  const redirectTo = new URL('/staff', window.location.origin).toString();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new Error('The invitation was created, but the sign-in link could not be sent. Check Supabase Auth email settings and retry.');
  }
}
