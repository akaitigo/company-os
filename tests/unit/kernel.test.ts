import { describe, expect, it } from 'vitest';
import { DomainError, Money, entityId, tenantId } from '../../packages/kernel/src/index.js';

describe('kernel value objects', () => {
  it('calculates money without IEEE-754 rounding', () => {
    expect(Money.ofMinor(10n, 'JPY').add(Money.ofMinor(20n, 'JPY')).toDecimal(0)).toBe('30');
    expect(Money.ofMinor(12345n, 'JPY').toDecimal()).toBe('123.45');
  });

  it('rejects currency mismatch and guessable identifiers', () => {
    expect(() => Money.ofMinor(1n, 'JPY').add(Money.ofMinor(1n, 'USD'))).toThrow(DomainError);
    expect(() => tenantId('tenant-1')).toThrowError(/UUID/);
    expect(() => entityId('42')).toThrowError(/UUID/);
    expect(() => Money.ofMinor(1n, 'yen')).toThrowError(/ISO 4217/);
  });

  it('renders negative money and rejects an invalid date', async () => {
    expect(Money.ofMinor(-123n, 'JPY').toDecimal()).toBe('-1.23');
    const { assertEffectivePeriod } = await import('../../packages/kernel/src/index.js');
    expect(() => {
      assertEffectivePeriod({ from: 'not-a-date' });
    }).toThrowError(/ISO dates/);
  });
});
