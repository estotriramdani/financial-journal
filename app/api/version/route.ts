import { NextResponse } from 'next/server';
import { connection } from 'next/server';

export async function GET() {
  await connection();
  return NextResponse.json({
    version: '1.2.0',
    buildTime: new Date().toISOString(),
    name: 'FINJRNL',
    channel: 'production',
  });
}
