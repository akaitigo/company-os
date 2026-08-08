import { randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestContext } from '@company-os/contracts';
import { bearerToken, OidcVerifier } from '@company-os/identity';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  companyOsContext?: RequestContext;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  private readonly verifier = new OidcVerifier({
    issuer: process.env['OIDC_ISSUER'] ?? 'http://localhost:8080/realms/company-os',
    audience: process.env['OIDC_AUDIENCE'] ?? 'company-os-api',
  });
  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        executionContext.getHandler(),
        executionContext.getClass(),
      ])
    )
      return true;
    const request = executionContext.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      const requestIdHeader = request.headers['x-request-id'];
      const requestId =
        typeof requestIdHeader === 'string' && /^[0-9a-f-]{36}$/i.test(requestIdHeader)
          ? requestIdHeader
          : randomUUID();
      request.companyOsContext = await this.verifier.verify(
        bearerToken(request.headers.authorization),
        requestId,
      );
      return true;
    } catch (error) {
      console.error(
        'OIDC bearer verification failed',
        error instanceof Error ? error.message : 'unknown error',
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
