import { describe, expect, it, vi } from 'vitest';
import {
  ORGANIZATION_EVENT_TYPE,
  processNext,
  reconnectDelay,
  runWorker,
} from '../../apps/worker/src/main.js';

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

  it('uses bounded exponential reconnect delay with jitter', () => {
    expect(reconnectDelay(1, () => 0)).toBe(125);
    expect(reconnectDelay(2, () => 1)).toBe(500);
    expect(reconnectDelay(100, () => 1)).toBe(30_000);
  });

  it('becomes degraded on disconnect and recovers without exiting', async () => {
    const controller = new AbortController();
    const health = { ready: true, consecutiveFailures: 0 };
    const logs: Record<string, unknown>[] = [];
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection terminated'))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const listeners = new Map<string, (error: Error) => void>();
    const pool = {
      connect: vi
        .fn()
        .mockRejectedValueOnce(new Error('database unavailable'))
        .mockResolvedValue({ query, release }),
      on: vi.fn((event: string, listener: (error: Error) => void) =>
        listeners.set(event, listener),
      ),
      off: vi.fn((event: string) => listeners.delete(event)),
    };
    const sleep = vi.fn().mockImplementation(() => {
      if (health.ready) controller.abort();
      return Promise.resolve();
    });

    await runWorker(pool as never, {
      signal: controller.signal,
      health,
      sleep,
      random: () => 0,
      log: (entry) => logs.push({ ...entry }),
    });

    expect(logs.map((entry) => entry.event)).toEqual([
      'worker.database.retry',
      'worker.database.retry',
      'worker.database.recovered',
    ]);
    expect(health).toEqual({ ready: true, consecutiveFailures: 0 });
    expect(pool.off).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
