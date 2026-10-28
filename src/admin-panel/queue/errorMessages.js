export function getQueueErrorMessage(error) {
  const code = error?.code;
  const message = typeof error?.message === 'string' ? error.message : '';

  if (code === 'PGRST116' || code === 'P0002') {
    return 'The requested restaurant or queue entry could not be found.';
  }
  if (code === '42501' || /not authorized|permission denied/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }
  if (code === '23505') {
    return 'This request was already submitted. Refresh the page to see its current status.';
  }
  if (/not accepting queue entries/i.test(message)) {
    return 'This restaurant is currently closed to new queue entries.';
  }
  if (/queue is currently full/i.test(message)) {
    return 'The queue is full right now. Please try again later.';
  }
  if (/transition is not allowed/i.test(message)) {
    return 'That status change is not allowed from the current state.';
  }
  if (/valid email|valid email and staff role/i.test(message)) {
    return 'Enter a valid email address and role.';
  }

  return 'We could not complete that request. Check your connection and try again.';
}
