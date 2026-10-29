import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, err, json, requireAuth } from '@/lib/mobile-api';


/**
 * GET /api/mobile/bootstrap
 * One round-trip after login: profile + groups + system categories.
 * The mobile app calls this on cold start with the stored access token.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { supabase, user } = ctx;

  try {
    const [profileR, groupsR, catsR] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('groups')
        .select('*, group_members!inner(role)')
        .order('created_at', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('is_system', true)
        .order('type')
        .order('name'),
    ]);

    if (profileR.error) return err(profileR.error.message, 500);
    if (groupsR.error) return err(groupsR.error.message, 500);
    if (catsR.error) return err(catsR.error.message, 500);

    const groups = (groupsR.data || []).map((g: Record<string, unknown> & { id: string; name: string; description: string | null; created_by: string; created_at: string; updated_at: string; group_members?: { role: string }[] | null }) => ({
      id: g.id,
      name: g.name,
      description: g.description ?? null,
      created_by: g.created_by,
      created_at: g.created_at,
      updated_at: g.updated_at,
      role: g.group_members?.[0]?.role ?? 'member',
    }));

    return json({
      profile: profileR.data,
      groups,
      categories: catsR.data || [],
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
