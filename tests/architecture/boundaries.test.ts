import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('architecture boundaries', () => {
  it('keeps domain modules independent of frameworks, ORM, network, and private module paths', () => {
    const violations: string[] = [];
    for (const file of sourceFiles('modules')) {
      const source = readFileSync(file, 'utf8');
      if (/from ['"](?:@nestjs|fastify|drizzle-orm|pg|node:http|node:net)/.test(source))
        violations.push(`${relative('.', file)} imports infrastructure`);
      if (/from ['"]@company-os\/(?:organization|authorization|audit|integration)\//.test(source))
        violations.push(`${relative('.', file)} imports module internals`);
    }
    expect(violations).toEqual([]);
  });
});
