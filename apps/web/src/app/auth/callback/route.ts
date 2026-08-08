import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { configuration, oidc, seal, unseal } from '../../../lib/auth';
interface AuthRequest {
  verifier: string;
  state: string;
}
export async function GET(request: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  const encrypted = jar.get('company_os_auth_request')?.value;
  if (encrypted === undefined)
    return NextResponse.json({ error: 'Authentication request expired' }, { status: 401 });
  try {
    const authRequest = await unseal<AuthRequest>(encrypted);
    const config = await configuration();
    const tokens = await oidc.authorizationCodeGrant(config, new URL(request.url), {
      pkceCodeVerifier: authRequest.verifier,
      expectedState: authRequest.state,
    });
    const expiresIn = Math.min(tokens.expires_in ?? 300, 900);
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('company_os_auth_request');
    response.cookies.set(
      'company_os_session',
      await seal({ accessToken: tokens.access_token }, `${expiresIn.toString()}s`),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env['NODE_ENV'] === 'production',
        path: '/',
        maxAge: expiresIn,
      },
    );
    return response;
  } catch (error) {
    console.error('OIDC callback failed', error instanceof Error ? error.message : 'unknown error');
    jar.delete('company_os_auth_request');
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
