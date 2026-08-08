import type { NextRequest } from 'next/server';
import { proxyApi } from '../../../lib/api-proxy';

export const GET = (request: NextRequest) => proxyApi(request, '/v1/organization-units');
export const POST = (request: NextRequest) => proxyApi(request, '/v1/organization-units');
