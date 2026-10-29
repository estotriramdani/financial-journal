import { NextResponse } from 'next/server';
import { CORS_HEADERS } from '@/lib/mobile-api';


/** GET /api/mobile/health — public liveness check for the mobile app. */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'finjrn-mobile-api', time: new Date().toISOString() },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
