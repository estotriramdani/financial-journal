import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient, type User } from '@supabase/supabase-js';

/**
 * Shared helpers for the /api/mobile/* REST layer that serves the
 * Flutter app (financial-journal-mobile).
 *
 * Auth model: the mobile app authenticates against Supabase Auth via
 * this proxy and keeps the access token. Every subsequent request
 * carries `Authorization: Bearer <token>`; we build a Supabase client
 * scoped to that user, so Postgres RLS enforces permissions exactly
 * like the web app does — no service-role access on data routes.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client',
  'Access-Control-Max-Age': '86400',
};

export function preflight() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 204 });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

/** Build a user-scoped Supabase client from the bearer token. */
export function userClient(req: NextRequest): SupabaseClient | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verify token server-side; returns the user or null. */
export async function authedUser(
  req: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const supabase = userClient(req);
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { supabase, user: data.user };
}

/** Require auth; on failure returns a NextResponse error to short-circuit. */
export async function requireAuth(
  req: NextRequest,
): Promise<
  | { supabase: SupabaseClient; user: User; errorResponse?: undefined }
  | { errorResponse: NextResponse }
> {
  const ctx = await authedUser(req);
  if (!ctx) {
    return { errorResponse: err('Tidak terotentikasi', 401) };
  }
  return ctx;
}

/** Supabase error -> NextResponse */
export function fromSbError(e: { message: string; code?: string } | null) {
  return err(e?.message || 'Terjadi kesalahan', 500, { code: e?.code });
}

/** Parse JSON body safely. Loose by design: callers validate each field. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function body(
  req: NextRequest,
): Promise<Record<string, any>> {
  try {
    return (await req.json()) as Record<string, any>;
  } catch {
    return {};
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
