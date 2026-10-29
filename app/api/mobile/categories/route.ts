import { NextRequest, NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  body,
  err,
  fromSbError,
  json,
  requireAuth,
} from '@/lib/mobile-api';


/** GET /api/mobile/categories?group_id=... */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;

  try {
    const groupId = req.nextUrl.searchParams.get('group_id');
    let query = supabase.from('categories').select('*').order('type').order('name');
    if (groupId) query = query.or(`is_system.eq.true,group_id.eq.${groupId},created_by.eq.${groupId}`);

    const { data, error } = await query;
    if (error) return fromSbError(error);
    return json({ categories: data || [] });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** POST /api/mobile/categories { name, type, group_id?, icon?, color? } */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase, user } = ctx;

  try {
    const b = await body(req);
    if (!b.name || (b.type !== 'income' && b.type !== 'expense'))
      return err('name dan type (income/expense) wajib diisi', 422);

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: b.name,
        type: b.type,
        group_id: b.group_id ?? null,
        icon: b.icon ?? null,
        color: b.color ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) return fromSbError(error);
    return json({ category: data }, 201);
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
