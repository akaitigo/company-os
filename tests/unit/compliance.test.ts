import { describe, expect, it } from 'vitest';
import { PublishedRuleVersion } from '../../modules/compliance/src/index.js';
describe('versioned compliance rules', () => {
  const rule = PublishedRuleVersion.publish({
    id: 'RULE-LABOR-001',
    version: 1,
    effectiveFrom: '2026-04-01',
    conditions: [
      { op: 'equals', field: 'worker.employed', value: true },
      { op: 'in', field: 'worker.country', values: ['JP'] },
    ],
    outcome: 'applicable',
  });
  it('preserves unknown when required facts are unavailable', () => {
    expect(rule.evaluate({ 'worker.employed': true }, '2026-08-09')).toBe('unknown');
    expect(rule.evaluate({ 'worker.employed': true, 'worker.country': 'JP' }, '2026-08-09')).toBe(
      'applicable',
    );
    expect(rule.evaluate({ 'worker.employed': false, 'worker.country': 'JP' }, '2026-08-09')).toBe(
      'not_applicable',
    );
  });
  it('is effective-dated, immutable and rejects unbounded DSL', () => {
    expect(rule.evaluate({ 'worker.employed': true, 'worker.country': 'JP' }, '2025-01-01')).toBe(
      'not_applicable',
    );
    expect(Object.isFrozen(rule.definition)).toBe(true);
    expect(() =>
      PublishedRuleVersion.publish({
        id: 'bad',
        version: 0,
        effectiveFrom: 'bad',
        conditions: [],
        outcome: 'applicable',
      }),
    ).toThrowError(/invalid/);
  });
});
