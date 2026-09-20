import { getProp, type ImisClient } from '../../shared/src/imis/index.js';

export type ConfiguredFormResult =
  | { state: 'ready'; formId: string }
  | { state: 'not-configured' }
  | { state: 'not-found' }
  | { state: 'error'; reason: string };

function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && '$value' in value) {
    return (value as { $value: unknown }).$value;
  }
  return value;
}

function parseObject(value: unknown): Record<string, unknown> {
  value = unwrap(value);
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function itemKey(item: unknown): string {
  const record = parseObject(item);
  const data = parseObject(record.Data);
  return String(
    record.ContentItemKey ??
      record.ContentItemId ??
      data.ContentItemKey ??
      data.ContentItemId ??
      getProp(item, 'ContentItemKey') ??
      getProp(item, 'ContentItemId') ??
      '',
  );
}

function verifiedItem(body: unknown, expectedKey: string): unknown | null {
  const record = parseObject(body);
  const items = parseObject(record.Items).$values;
  if (!Array.isArray(items)) return itemKey(body) === expectedKey ? body : null;
  const matches = items.filter((item) => itemKey(item) === expectedKey);
  return matches.length === 1 ? matches[0] : null;
}

function itemSettings(item: unknown): Record<string, unknown> {
  const record = parseObject(item);
  const data = parseObject(record.Data);
  const candidates = [
    data.Settings,
    data.JsonSettings,
    record.Settings,
    record.JsonSettings,
    getProp(item, 'Settings'),
    getProp(item, 'JsonSettings'),
  ];
  for (const candidate of candidates) {
    const settings = parseObject(candidate);
    if (Object.keys(settings).length > 0) return settings;
  }
  return {};
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Resolve the locked per-placement FormID and apply the #24 wrong-row guard. */
export async function resolveConfiguredFormId(
  client: ImisClient,
  contentItemKey: string,
  contentKey = '',
): Promise<ConfiguredFormResult> {
  if (!contentItemKey || contentItemKey.startsWith('[x-')) return { state: 'not-configured' };
  const path =
    '/api/ContentItem?ContentItemKey=' +
    encodeURIComponent(contentItemKey) +
    (contentKey && !contentKey.startsWith('[x-')
      ? '&ContentKey=' + encodeURIComponent(contentKey)
      : '');
  const response = await client.get(path);
  if (!response.ok) {
    return {
      state: 'error',
      reason: response.networkError ?? `ContentItem request failed (HTTP ${response.status})`,
    };
  }
  const item = verifiedItem(response.body, contentItemKey);
  if (!item) return { state: 'not-found' };
  const settings = itemSettings(item);
  const formId = settings.formId == null ? '' : String(settings.formId);
  if (!formId) return { state: 'not-configured' };
  if (!isGuid(formId)) return { state: 'error', reason: 'Configured formId is not a GUID' };
  return { state: 'ready', formId };
}
