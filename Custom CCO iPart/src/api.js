import { unwrap } from './contracts.js';

export function webRoot(win) {
  const root = String(win.gWebRoot || '').replace(/\/+$/, '');
  const url = new URL(root || '/', win.location.origin);
  if (url.origin !== win.location.origin || url.search || url.hash) throw new Error('The iMIS web root must be same-origin.');
  return url.pathname.replace(/\/+$/, '');
}

export function createApi(win) {
  return async (method, path, payload, signal) => {
    const controller = new win.AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = win.setTimeout(() => controller.abort(new Error('The iMIS request timed out after 30 seconds.')), 30000);
    try {
      const token = win.document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const response = await win.fetch(`${webRoot(win)}/api/${path}`, {
        method, signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
      });
      if (!response.ok) throw new Error(`iMIS request failed (HTTP ${response.status}). Check access and session status.`);
      let result;
      try { result = await response.json(); } catch { throw new Error('iMIS returned an unexpected non-JSON response. Check session status.'); }
      if (unwrap(result?.IsSuccessStatusCode) === false || unwrap(result?.IsValid) === false) throw new Error('iMIS reported that the requested operation failed.');
      return result;
    } finally {
      win.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}
