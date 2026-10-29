import { NextRequest, NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  body,
  err,
  fromSbError,
  json,
  requireAuth,
} from '@/lib/mobile-api';


type Params = { params: Promise<{ id: string }> };

/** PATCH /api/mobile/transactions/:id */
export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const b = await body(req);
    const patch: Record<string, unknown> = {};
    if (b.category_id !== undefined) patch.category_id = b.category_id;
    if (b.type !== undefined) patch.type = b.type;
    if (b.amount !== undefined) patch.amount = Number(b.amount);
    if (b.description !== undefined) patch.description = b.description;
    if (b.transaction_date !== undefined) patch.transaction_date = b.transaction_date;
    if (Object.keys(patch).length === 0) return err('Tidak ada field untuk diupdate', 422);

    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select('*, categories(id,name,type,icon,color), profiles(name,email)')
      .single();

    if (error) return fromSbError(error);
    return json({ transaction: data });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** DELETE /api/mobile/transactions/:id */
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) return fromSbError(error);
    return json({ ok: true });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** GET /api/mobile/transactions/:id */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(id,name,type,icon,color), profiles(name,email)')
      .eq('id', id)
      .single();
    if (error) return fromSbError(error);
    return json({ transaction: data });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
