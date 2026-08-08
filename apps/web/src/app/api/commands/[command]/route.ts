import { NextResponse, type NextRequest } from 'next/server';
import { proxyApi } from '../../../../lib/api-proxy';

const paths: Readonly<Record<string, string>> = {
  attendance: '/v1/workforce/attendance',
  requisition: '/v1/procurement/requisitions',
  journal: '/v1/finance/journals',
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ command: string }> },
): Promise<NextResponse> {
  const { command } = await context.params;
  const path = paths[command];
  if (path === undefined) return NextResponse.json({ error: 'Unknown command' }, { status: 404 });
  return proxyApi(request, path);
}
