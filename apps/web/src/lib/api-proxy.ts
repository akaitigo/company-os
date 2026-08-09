import { randomUUID } from 'node:crypto';
import { decodeJwt } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { sessionAccessToken } from './session';

export async function proxyApi(request: NextRequest, apiPath: string): Promise<NextResponse> {
  const token = await sessionAccessToken();
  if (token === undefined) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const api = new URL(apiPath, process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:3001');
  if (request.method === 'GET') api.search = request.nextUrl.search;
  let body: string | undefined;
  if (request.method !== 'GET') {
    const claims = decodeJwt(token);
    const tenantId = claims['tenant_id'];
    if (typeof tenantId !== 'string')
      return NextResponse.json({ error: 'Token has no tenant' }, { status: 401 });
    body = JSON.stringify({ ...((await request.json()) as Record<string, unknown>), tenantId });
  }
  const response = await fetch(api, {
    method: request.method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
    },
    ...(body === undefined ? {} : { body }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  return new NextResponse(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}
