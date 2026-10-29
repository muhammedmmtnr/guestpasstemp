import { getQueueErrorMessage } from './errorMessages';

export { getQueueErrorMessage };

export function requireQueueBackend() {
  throw new Error('Restaurant queue operations are unavailable until their REST API routes are provided.');
}

export async function callQueueRpc(name, args) {
  void name;
  void args;
  throw new Error('Restaurant queue operations are unavailable until their REST API routes are provided.');
}

export function firstRow(data) {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}
