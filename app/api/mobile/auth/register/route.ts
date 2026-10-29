import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, body, err, json } from '@/lib/mobile-api';


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** POST /api/mobile/auth/register { name, email, password } */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await body(req);
    if (!name || !email || !password)
      return err('Nama, email, dan password wajib diisi', 422);

    const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return err(error.message, 400, { code: error.name });

    const needsConfirmation = data.session === null;
    return json({
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : null,
      needs_confirmation: needsConfirmation,
    });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
