import { NextRequest, NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  body,
  err,
  fromSbError,
  json,
  requireAuth,
} from '@/lib/mobile-api';


/**
 * GET /api/mobile/transactions?group_id=...&from=YYYY-MM-DD&to=YYYY-MM-DD&month=YYYY-MM
 * List transactions for a group the user belongs to (RLS-enforced).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;

  try {
    const sp = req.nextUrl.searchParams;
    const groupId = sp.get('group_id');
    if (!groupId) return err('group_id wajib diisi', 422);

    let query = supabase
      .from('transactions')
      .select('*, categories(id,name,type,icon,color), profiles(name,email)')
      .eq('group_id', groupId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000);

    const month = sp.get('month'); // YYYY-MM
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      const from = `${month}-01`;
      const last = new Date(y, m, 0).getDate();
      const to = `${month}-${String(last).padStart(2, '0')}`;
      query = query.gte('transaction_date', from).lte('transaction_date', to);
    } else {
      const from = sp.get('from');
      const to = sp.get('to');
      if (from) query = query.gte('transaction_date', from);
      if (to) query = query.lte('transaction_date', to);
    }

    const { data, error } = await query;
    if (error) return fromSbError(error);
    return json({ transactions: data || [] });
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

/** POST /api/mobile/transactions { group_id, category_id?, type, amount, description?, transaction_date } */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase, user } = ctx;

  try {
    const b = await body(req);
    const group_id = b.group_id;
    const type = b.type;
    const amount = Number(b.amount);

    if (!group_id) return err('group_id wajib diisi', 422);
    if (type !== 'income' && type !== 'expense')
      return err('type harus income/expense', 422);
    if (!Number.isFinite(amount) || amount <= 0)
      return err('amount harus > 0', 422);
    if (!b.transaction_date || !/^\d{4}-\d{2}-\d{2}$/.test(b.transaction_date))
      return err('transaction_date format YYYY-MM-DD', 422);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        group_id,
        category_id: b.category_id ?? null,
        type,
        amount,
        description: b.description ?? null,
        transaction_date: b.transaction_date,
        created_by: user.id,
      })
      .select('*, categories(id,name,type,icon,color), profiles(name,email)')
      .single();

    if (error) return fromSbError(error);
    return json({ transaction: data }, 201);
  } catch (e: any) {
    return err(e?.message || 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
