import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete('company_os_session');
  return response;
}
