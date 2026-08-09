import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Ledger {
  releaseStatus: string;
  capabilities: Array<{ priority: string; status: string }>;
}

describe('product evidence release gate', () => {
  it('accepts the current honest reassessment ledger', () => {
    expect(() => execFileSync('./scripts/verify-product', { stdio: 'pipe' })).not.toThrow();
  });

  it('rejects GA while a mandatory capability is incomplete', () => {
    const source = JSON.parse(readFileSync('docs/product/capabilities.json', 'utf8')) as Ledger;
    source.releaseStatus = 'ga';
    const directory = mkdtempSync(join(tmpdir(), 'company-os-product-ledger-'));
    const ledgerPath = join(directory, 'capabilities.json');
    writeFileSync(ledgerPath, JSON.stringify(source));

    const result = spawnSync('./scripts/verify-product', {
      env: { ...process.env, PRODUCT_LEDGER_PATH: ledgerPath },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('GA forbidden; incomplete mandatory capabilities');
  });

  it('rejects evidence paths outside the repository', () => {
    const source = JSON.parse(readFileSync('docs/product/capabilities.json', 'utf8')) as Ledger & {
      capabilities: Array<{ evidence: { domain?: string[] } }>;
    };
    const first = source.capabilities[0];
    expect(first).toBeDefined();
    if (first !== undefined) first.evidence = { domain: ['/etc/passwd'] };
    const directory = mkdtempSync(join(tmpdir(), 'company-os-product-ledger-'));
    const ledgerPath = join(directory, 'capabilities.json');
    writeFileSync(ledgerPath, JSON.stringify(source));

    const result = spawnSync('./scripts/verify-product', {
      env: { ...process.env, PRODUCT_LEDGER_PATH: ledgerPath },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('unsafe evidence path /etc/passwd');
  });
});
