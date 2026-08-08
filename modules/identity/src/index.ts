import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import type { RequestContext } from '@company-os/contracts';

const claimsSchema = z.object({
  sub: z.uuid(),
  tenant_id: z.uuid(),
  roles: z.array(z.string().min(1).max(64)).max(32).default([]),
});

export interface OidcVerifierConfig {
  readonly issuer: string;
  readonly audience: string;
  readonly jwks?: JWTVerifyGetKey;
  readonly clockToleranceSeconds?: number;
}

export class OidcVerifier {
  private readonly jwks: JWTVerifyGetKey;
  constructor(private readonly config: OidcVerifierConfig) {
    const issuer = new URL(config.issuer);
    if (
      issuer.protocol !== 'https:' &&
      issuer.hostname !== 'localhost' &&
      issuer.hostname !== '127.0.0.1'
    ) {
      throw new Error('OIDC issuer must use HTTPS outside local development');
    }
    this.jwks =
      config.jwks ??
      createRemoteJWKSet(
        new URL(`${config.issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`),
        {
          timeoutDuration: 3_000,
          cooldownDuration: 30_000,
          cacheMaxAge: 600_000,
        },
      );
  }

  async verify(token: string, requestId: string): Promise<RequestContext> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithms: ['RS256', 'ES256'],
      clockTolerance: this.config.clockToleranceSeconds ?? 5,
      maxTokenAge: '15m',
      requiredClaims: ['sub', 'tenant_id', 'iat', 'exp'],
    });
    const claims = claimsSchema.parse(payload);
    return { requestId, tenantId: claims.tenant_id, actorId: claims.sub, roles: claims.roles };
  }
}

export function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined) throw new Error('Missing Authorization header');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (match?.[1] === undefined || match[1].length > 16_384) throw new Error('Invalid bearer token');
  return match[1];
}
