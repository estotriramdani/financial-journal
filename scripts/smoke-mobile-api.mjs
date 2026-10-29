// Smoke test for /api/mobile/* — run with: node scripts/smoke-mobile-api.mjs [BASE_URL]
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3000';

// load .env.local
const env = {};
for (const line of fs.readFileSync(path.resolve('.env.local'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [k, ...v] = t.split('=');
  env[k.trim()] = v.join('=').trim();
}

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = 'smoke.mobile@mailinator.com';
const PASSWORD = 'Smoke1234!';

async function j(url, opts) {
  const r = await fetch(url, opts);
  let b;
  try { b = await r.json(); } catch { b = { _raw: 'non-json', _status: r.status }; }
  return { status: r.status, body: b };
}

// 1. ensure test user exists (service role, email confirmed)
let res = await j(`${SUPA}/auth/v1/admin/users`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
});
const existing = (res.body.users || []).find((u) => u.email === EMAIL);
if (!existing) {
  res = await j(`${SUPA}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, data: { name: 'Smoke Mobile' } }),
  });
  if (!res.body.id) { console.log('user', res.status, res.body); process.exit(1); }
  console.log('created test user', res.body.id);
  await new Promise((r) => setTimeout(r, 1500)); // wait for trigger
}

// 2. login via mobile API
res = await j(`${BASE}/api/mobile/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
console.log('login:', res.status);
if (res.status !== 200) { console.log(res.body); process.exit(1); }
const token = res.body.session.access_token;
console.log('profile:', res.body.profile?.name);

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// 3. bootstrap
res = await j(`${BASE}/api/mobile/bootstrap`, { headers: H });
console.log('bootstrap:', res.status, 'groups=', res.body.groups?.length, 'cats=', res.body.categories?.length);
const groupId = res.body.groups?.[0]?.id;
if (!groupId) { console.log(res.body); process.exit(1); }

// 4. create transaction
const cat = res.body.categories.find((c) => c.type === 'expense');
res = await j(`${BASE}/api/mobile/transactions`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ group_id: groupId, category_id: cat?.id, type: 'expense', amount: 25000, description: 'Kopi pagi (smoke)', transaction_date: new Date().toISOString().slice(0, 10) }),
});
console.log('tx create:', res.status, res.body.transaction?.id?.slice(0, 8));
const txId = res.body.transaction?.id;

// 5. list
res = await j(`${BASE}/api/mobile/transactions?group_id=${groupId}`, { headers: H });
console.log('tx list:', res.status, 'count=', res.body.transactions?.length);

// 6. summary
res = await j(`${BASE}/api/mobile/summary?group_id=${groupId}`, { headers: H });
console.log('summary:', res.status, 'income=', res.body.total_income, 'expense=', res.body.total_expense, 'n=', res.body.transaction_count);

// 7. unauthenticated is 401
res = await j(`${BASE}/api/mobile/bootstrap`);
console.log('no-auth:', res.status, res.body.error);

// 8. delete tx + detail
res = await j(`${BASE}/api/mobile/transactions/${txId}`, { method: 'DELETE', headers: H });
console.log('tx delete:', res.status);

console.log('SMOKE DONE');
