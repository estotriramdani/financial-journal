import { NextRequest, NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  body,
  err,
  fromSbError,
  json,
  requireAuth,
} from '@/lib/mobile-api';


/** GET /api/mobile/groups */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;

  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members!inner(role)')
      .order('created_at', { ascending: true });
    if (error) return fromSbError(error);

    const groups = (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description ?? null,
      created_by: g.created_by,
      role: g.group_members?.[0]?.role ?? 'member',
    }));
    return json({ groups });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** POST /api/mobile/groups { name, description? } */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase, user } = ctx;

  try {
    const b = await body(req);
    if (!b.name) return err('name wajib diisi', 422);

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: b.name, description: b.description ?? null, created_by: user.id })
      .select('*')
      .single();
    if (error) return fromSbError(error);

    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'owner' });
    if (memberErr) return fromSbError(memberErr);

    return json({ group: { ...group, role: 'owner' } }, 201);
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
