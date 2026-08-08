import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { configuration, oidc, seal } from '../../../lib/auth';
export async function GET(): Promise<NextResponse> {
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  const state = oidc.randomState();
  const config = await configuration();
  const redirectUri = process.env['OIDC_REDIRECT_URI'] ?? 'http://localhost:3000/auth/callback';
  const target = oidc.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: 'openid profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  const jar = await cookies();
  jar.set('company_os_auth_request', await seal({ verifier, state }, '10m'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/auth',
    maxAge: 600,
  });
  return NextResponse.redirect(target);
}
