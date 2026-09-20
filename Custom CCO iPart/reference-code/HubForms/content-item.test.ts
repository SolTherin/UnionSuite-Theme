import { describe, expect, it } from 'vitest';
import { ImisClient } from '../../shared/src/imis/index.js';
import { resolveConfiguredFormId } from './content-item.js';

const ITEM = '2e0cccdf-ae47-4bc5-b22e-9355fe2c079c';
const FORM = '398bd4ea-4a75-4bac-997b-d456f7c0cf9c';

function clientWith(body: unknown, status = 200): ImisClient {
  return new ImisClient({
    fetchImpl: async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
}

describe('resolveConfiguredFormId', () => {
  it('resolves Settings from string Data after verifying ContentItemKey', async () => {
    const client = clientWith({
      Items: {
        $values: [
          {
            Data: JSON.stringify({
              ContentItemKey: ITEM,
              Settings: JSON.stringify({ formId: FORM }),
            }),
          },
        ],
      },
    });
    await expect(resolveConfiguredFormId(client, ITEM, 'content-key')).resolves.toEqual({
      state: 'ready',
      formId: FORM,
    });
  });

  it('resolves GenericEntity JsonSettings', async () => {
    const client = clientWith({
      Items: {
        $values: [
          {
            Properties: {
              $values: [
                { Name: 'ContentItemKey', Value: ITEM },
                { Name: 'JsonSettings', Value: { $value: JSON.stringify({ formId: FORM }) } },
              ],
            },
          },
        ],
      },
    });
    await expect(resolveConfiguredFormId(client, ITEM)).resolves.toEqual({
      state: 'ready',
      formId: FORM,
    });
  });

  it('rejects wrong, duplicate, missing, and malformed selections', async () => {
    await expect(
      resolveConfiguredFormId(
        clientWith({ Items: { $values: [{ Data: { ContentItemKey: 'wrong' } }] } }),
        ITEM,
      ),
    ).resolves.toEqual({ state: 'not-found' });
    await expect(
      resolveConfiguredFormId(
        clientWith({
          Items: {
            $values: [
              { Data: { ContentItemKey: ITEM, Settings: { formId: FORM } } },
              { Data: { ContentItemKey: ITEM, Settings: { formId: FORM } } },
            ],
          },
        }),
        ITEM,
      ),
    ).resolves.toEqual({ state: 'not-found' });
    await expect(
      resolveConfiguredFormId(
        clientWith({ Items: { $values: [{ Data: { ContentItemKey: ITEM, Settings: {} } }] } }),
        ITEM,
      ),
    ).resolves.toEqual({ state: 'not-configured' });
    await expect(
      resolveConfiguredFormId(
        clientWith({
          Items: {
            $values: [{ Data: { ContentItemKey: ITEM, Settings: { formId: 'not-a-guid' } } }],
          },
        }),
        ITEM,
      ),
    ).resolves.toEqual({ state: 'error', reason: 'Configured formId is not a GUID' });
  });
});
