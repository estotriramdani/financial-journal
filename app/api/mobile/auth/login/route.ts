import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS, body, err, json, preflight } from '@/lib/mobile-api';


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function anon() {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** POST /api/mobile/auth/login { email, password } -> { session, profile } */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await body(req);
    if (!email || !password) return err('Email dan password wajib diisi', 422);

    const { data, error } = await anon().auth.signInWithPassword({
      email,
      password,
    });
    if (error) return err(error.message, 401, { code: error.name });

    const profile = await fetchProfile(data.session.access_token, email);
    return json({ session: data.session, profile });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** POST /api/mobile/auth/register { name, email, password } */
export async function register(req: NextRequest) {
  return POST(req);
}

async function fetchProfile(accessToken: string, email: string) {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return data;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
