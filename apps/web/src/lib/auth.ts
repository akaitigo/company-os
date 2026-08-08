import { createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import * as oidc from 'openid-client';

const issuer = new URL(process.env['OIDC_ISSUER'] ?? 'http://localhost:8080/realms/company-os');
const clientId = process.env['OIDC_CLIENT_ID'] ?? 'company-os-web';
function encryptionKey(): Uint8Array {
  const secret = process.env['SESSION_SECRET'];
  if (secret === undefined || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  return createHash('sha256').update(secret).digest();
}
let cachedConfiguration: oidc.Configuration | undefined;
export async function configuration(): Promise<oidc.Configuration> {
  cachedConfiguration ??= await oidc.discovery(issuer, clientId);
  return cachedConfiguration;
}
export async function seal(values: Record<string, unknown>, expiresIn: string): Promise<string> {
  return new EncryptJWT(values)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .encrypt(encryptionKey());
}
export async function unseal<T>(value: string): Promise<T> {
  const { payload } = await jwtDecrypt(value, encryptionKey(), {
    keyManagementAlgorithms: ['dir'],
    contentEncryptionAlgorithms: ['A256GCM'],
  });
  return payload as T;
}
export { oidc };
