// The iMIS fetch client (BUILD-PLAN P1.3).
//
// Framework-free (rxjs→fetch, forkJoin→Promise.all at call sites). Adds the iMIS auth surface to
// every request: the `RequestVerificationToken` header when the page exposes it, and
// `credentials:'include'` so the iMIS session cookie rides cross-origin (Cloudflare → iMIS CORS).
//
// THE WRITE-500 RULE (P1.3, resolved 2026-08-09 by probes/probe-p1-3-party-500.browser.js):
// iMIS can return HTTP 500 on a write that actually SAVED (the /api/Party serialization bug). The
// real 500 body is a GENERIC, non-JSON string ("An error occurred. Please contact the
// administrator.") — indistinguishable from a genuine failure by body alone. So there is NO reliable
// body signature to auto-classify success: a write 500 is ALWAYS `needs-confirmation`, and the caller
// MUST verify with a follow-up GET before reporting success (form-writer does this; the submit engine
// gains it in P5.4). Never treat a 500 as success on the strength of its body.

const TOKEN_ELEMENT_ID = '__RequestVerificationToken';

function tokenFromDocument(source: Document): string {
  const byId = source.getElementById(TOKEN_ELEMENT_ID) as HTMLInputElement | null;
  const byName = source.querySelector<HTMLInputElement>(`input[name="${TOKEN_ELEMENT_ID}"]`);
  return byId?.value ?? byName?.value ?? '';
}

export function readImisVerificationToken(source: Document, parentSource?: Document): string {
  return tokenFromDocument(source) || (parentSource ? tokenFromDocument(parentSource) : '');
}

function defaultGetToken(): string {
  if (typeof document === 'undefined') return '';
  const local = readImisVerificationToken(document);
  if (local) return local;
  if (typeof window === 'undefined' || window.parent === window) return '';
  try {
    // Same-document embeds resolve above. Keep this same-origin parent fallback for legacy/test
    // shells; a direct cross-origin Pages iframe fails closed and cannot expose the iMIS token.
    return readImisVerificationToken(document, window.parent.document);
  } catch {
    return '';
  }
}

export interface ImisClientOptions {
  /** API origin. `''` (default) = same-origin (in-page iPart). A full origin for cross-origin dev. */
  baseUrl?: string;
  /** Injectable fetch (default `globalThis.fetch`) — the seam the mock-iMIS helper plugs into. */
  fetchImpl?: typeof fetch;
  /** Verification-token provider (default reads the DOM). */
  getToken?: () => string;
}

export interface ImisFetchResult {
  status: number;
  ok: boolean;
  /** Parsed JSON, raw text when non-JSON, or null when empty/absent. */
  body: unknown;
  /** True when a body was present but was not valid JSON. */
  malformed: boolean;
  /** Set when the request never reached a response (network/CORS failure). */
  networkError?: string;
}

export type WriteOutcome =
  | { status: 'ok'; via: 'response'; body: unknown }
  | { status: 'needs-confirmation'; httpStatus: number; body: unknown }
  | { status: 'failed'; httpStatus: number; reason: string };

function validationFailure(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (record.IsValid !== false) return null;
  const validation = record.ValidationResults as
    { Errors?: { $values?: Array<{ Message?: unknown }> } } | undefined;
  const messages = validation?.Errors?.$values
    ?.map((error) => String(error.Message ?? '').trim())
    .filter(Boolean);
  return messages?.length ? messages.join('; ') : 'iMIS validation failed';
}

function responseError(body: unknown): string | null {
  if (typeof body === 'string') return body.trim() || null;
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  for (const key of ['ExceptionMessage', 'Message']) {
    const value = String(record[key] ?? '').trim();
    if (value) return value;
  }
  return null;
}

export class ImisClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getToken: () => string;

  constructor(opts: ImisClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? '';
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.getToken = opts.getToken ?? defaultGetToken;
  }

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return this.baseUrl.replace(/\/+$/, '') + (path.startsWith('/') ? path : `/${path}`);
  }

  private headers(hasBody: boolean): Record<string, string> {
    const token = this.getToken();
    return {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { RequestVerificationToken: token } : {}),
    };
  }

  /** Low-level request. Never throws on HTTP status; only surfaces network failure via `networkError`. */
  async request(method: string, path: string, body?: unknown): Promise<ImisFetchResult> {
    const hasBody = body !== undefined && body !== null;
    let res: Response;
    try {
      res = await this.fetchImpl(this.url(path), {
        method,
        credentials: 'include',
        headers: this.headers(hasBody),
        ...(hasBody ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      return {
        status: 0,
        ok: false,
        body: null,
        malformed: false,
        networkError: err instanceof Error ? err.message : String(err),
      };
    }
    const text = await res.text();
    let parsed: unknown = null;
    let malformed = false;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        malformed = true;
        parsed = text;
      }
    }
    return { status: res.status, ok: res.ok, body: parsed, malformed };
  }

  get(path: string): Promise<ImisFetchResult> {
    return this.request('GET', path);
  }

  post(path: string, body: unknown): Promise<ImisFetchResult> {
    return this.request('POST', path, body);
  }

  put(path: string, body: unknown): Promise<ImisFetchResult> {
    return this.request('PUT', path, body);
  }

  delete(path: string): Promise<ImisFetchResult> {
    return this.request('DELETE', path);
  }

  /**
   * Classify a write response. Pure — no I/O — so it's exhaustively testable. A 2xx `IsValid:false`
   * body is a failure; a 500 is never auto-success (needs GET-confirm, P1.3); other non-2xx fail.
   */
  classifyWrite(res: ImisFetchResult): WriteOutcome {
    const invalid = validationFailure(res.body);
    if (invalid) return { status: 'failed', httpStatus: res.status, reason: invalid };
    if (res.ok) {
      return { status: 'ok', via: 'response', body: res.body };
    }
    if (res.networkError) {
      return { status: 'failed', httpStatus: 0, reason: `network: ${res.networkError}` };
    }
    if (res.status === 500) {
      // A write 500 may have saved (the /api/Party serialization bug) but the body can't prove it
      // (P1.3): always unconfirmed — the caller GET-confirms before claiming success.
      return { status: 'needs-confirmation', httpStatus: 500, body: res.body };
    }
    const detail = responseError(res.body);
    return {
      status: 'failed',
      httpStatus: res.status,
      reason: detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`,
    };
  }

  /** POST/PUT an entity and classify the outcome in one call. */
  async writeEntity(method: 'POST' | 'PUT', path: string, entity: unknown): Promise<WriteOutcome> {
    const res = await this.request(method, path, entity);
    return this.classifyWrite(res);
  }
}
