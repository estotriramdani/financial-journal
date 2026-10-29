import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, err, fromSbError, json, requireAuth } from '@/lib/mobile-api';


/**
 * GET /api/mobile/summary?group_id=...&month=YYYY-MM
 * Totals + per-category breakdown for a group/month (RLS-enforced).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase } = ctx;

  try {
    const sp = req.nextUrl.searchParams;
    const groupId = sp.get('group_id');
    if (!groupId) return err('group_id wajib diisi', 422);

    let month = sp.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(last).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, category_id, categories(name, icon, color)')
      .eq('group_id', groupId)
      .gte('transaction_date', from)
      .lte('transaction_date', to);
    if (error) return fromSbError(error);

    const rows = data || [];
    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<
      string,
      { name: string; type: string; icon: string | null; color: string | null; total: number; count: number }
    > = {};

    for (const t of rows) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else totalExpense += amt;

      const raw = (t as Record<string, unknown>).categories;
      const cat = (Array.isArray(raw) ? raw[0] : raw) as
        | { id?: string; name?: string; icon?: string | null; color?: string | null }
        | null
        | undefined;
      const key = cat?.id ?? 'tanpa_kategori';
      if (!byCategory[key]) {
        byCategory[key] = {
          name: cat?.name ?? 'Tanpa Kategori',
          type: t.type,
          icon: cat?.icon ?? null,
          color: cat?.color ?? null,
          total: 0,
          count: 0,
        };
      }
      byCategory[key].total += amt;
      byCategory[key].count += 1;
    }

    return json({
      month,
      period: { from, to },
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      transaction_count: rows.length,
      by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
