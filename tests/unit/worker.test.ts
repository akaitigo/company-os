import { describe, expect, it, vi } from 'vitest';
import { ORGANIZATION_EVENT_TYPE, processNext } from '../../apps/worker/src/main.js';

describe('organization projection worker', () => {
  it('selects only its subscribed event type so unrelated events cannot poison the queue', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) };

    await expect(processNext(pool as never)).resolves.toBe(false);
    expect(query.mock.calls[1]?.[0]).toContain('event_type=$1');
    expect(query.mock.calls[1]?.[1]).toEqual([ORGANIZATION_EVENT_TYPE, 20]);
    expect(release).toHaveBeenCalledOnce();
  });

  it('backs off a malformed subscribed event instead of crashing the worker', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: '11111111-1111-4111-8111-111111111111',
            id: '22222222-2222-4222-8222-222222222222',
            event_type: ORGANIZATION_EVENT_TYPE,
            aggregate_id: '33333333-3333-4333-8333-333333333333',
            aggregate_version: 1,
            payload: { invalid: true },
            attempts: 0,
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) };

    await expect(processNext(pool as never)).resolves.toBe(true);
    expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining('attempts=least(attempts+1'), [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      20,
      expect.any(String),
    ]);
    expect(release).toHaveBeenCalledOnce();
  });
});
