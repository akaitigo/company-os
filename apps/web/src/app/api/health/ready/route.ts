import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const apiInternalUrl = process.env['API_INTERNAL_URL'];
    if (!apiInternalUrl) {
      throw new Error('API dependency is not configured.');
    }

    const response = await fetch(`${apiInternalUrl}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      throw new Error('API dependency is not ready.');
    }

    return NextResponse.json({ status: 'ready', service: 'web' });
  } catch {
    return NextResponse.json({ status: 'degraded', service: 'web' }, { status: 503 });
  }
}
