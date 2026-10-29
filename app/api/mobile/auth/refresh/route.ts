import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, body, err, json } from '@/lib/mobile-api';

/** POST /api/mobile/auth/refresh { refresh_token } -> { session } */
export async function POST(req: NextRequest) {
  try {
    const { refresh_token } = await body(req);
    if (!refresh_token) return err('refresh_token wajib diisi', 422);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });
    if (error || !data.session) {
      return err(error?.message || 'Sesi tidak valid', 401);
    }
    return json({ session: data.session });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
