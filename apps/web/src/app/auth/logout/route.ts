import { NextResponse } from 'next/server';
export function GET(): NextResponse {
  const publicOrigin = new URL(
    process.env['OIDC_REDIRECT_URI'] ?? 'http://localhost:3000/auth/callback',
  );
  const response = NextResponse.redirect(new URL('/', publicOrigin));
  response.cookies.delete('company_os_session');
  return response;
}
