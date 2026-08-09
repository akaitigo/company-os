import { readFileSync } from 'node:fs';

const MAX_SECRET_BYTES = 8_192;

export function loadFileBackedSecret(name: string): void {
  const fileName = process.env[`${name}_FILE`];
  const direct = process.env[name];
  if (fileName === undefined) return;
  if (direct !== undefined) throw new Error(`${name} and ${name}_FILE cannot both be set`);
  const value = readFileSync(fileName, { encoding: 'utf8', flag: 'r' });
  if (Buffer.byteLength(value) > MAX_SECRET_BYTES)
    throw new Error(`${name}_FILE exceeds 8192 bytes`);
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (normalized.length === 0 || normalized.includes('\n') || normalized.includes('\0'))
    throw new Error(`${name}_FILE has invalid content`);
  process.env[name] = normalized;
}
