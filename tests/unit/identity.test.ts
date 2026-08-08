import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { bearerToken, OidcVerifier } from '../../modules/identity/src/index.js';

let privateKey: CryptoKey;
let verifier: OidcVerifier;
const issuer = 'https://identity.example.test/realms/company-os';
const audience = 'company-os-api';

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  verifier = new OidcVerifier({
    issuer,
    audience,
    jwks: createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'key-1', alg: 'RS256', use: 'sig' }] }),
  });
});

function token(overrides: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({
    tenant_id: '11111111-1111-4111-8111-111111111111',
    roles: ['organization-admin'],
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
    .setSubject('22222222-2222-4222-8222-222222222222')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('OIDC authentication boundary', () => {
  it('accepts a signed token with exact issuer, audience and bounded claims', async () => {
    await expect(
      verifier.verify(await token(), '33333333-3333-4333-8333-333333333333'),
    ).resolves.toMatchObject({
      tenantId: '11111111-1111-4111-8111-111111111111',
      actorId: '22222222-2222-4222-8222-222222222222',
      roles: ['organization-admin'],
    });
  });
  it('fails closed for wrong audience, malformed claims and unavailable key', async () => {
    const wrongAudience = new OidcVerifier({
      issuer,
      audience: 'other-api',
      jwks: () => Promise.reject(new Error('JWKS unavailable')),
    });
    await expect(
      wrongAudience.verify(await token(), '33333333-3333-4333-8333-333333333333'),
    ).rejects.toThrow();
    await expect(
      verifier.verify(
        await token({ tenant_id: 'not-a-uuid' }),
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow();
  });
  it('rejects insecure non-local issuers and malformed bearer headers', () => {
    expect(
      () => new OidcVerifier({ issuer: 'http://identity.example.test', audience }),
    ).toThrowError(/HTTPS/);
    expect(bearerToken('Bearer abc.def_sig-1')).toBe('abc.def_sig-1');
    expect(() => bearerToken('Basic abc')).toThrowError(/Invalid/);
  });
});
