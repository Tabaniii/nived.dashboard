import { after } from 'next/server';

/**
 * Run work after the response is sent. Outside a request scope (unit tests,
 * scripts) `after()` throws, so the task runs in the background immediately.
 *
 * @param {() => Promise<unknown>} task
 */
export function runAfterResponse(task) {
  const guarded = () =>
    Promise.resolve()
      .then(task)
      .catch((err) => console.error('[after] Deferred task failed:', err));

  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
