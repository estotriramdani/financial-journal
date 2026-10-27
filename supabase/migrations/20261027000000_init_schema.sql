-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Groups Table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Group Members Table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- 4. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_system boolean not null default false,
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Transactions Table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(15, 2) not null check (amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_transactions_group on public.transactions(group_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_date on public.transactions(transaction_date desc);
create index if not exists idx_transactions_created_by on public.transactions(created_by);
create index if not exists idx_categories_group on public.categories(group_id);

-- Helper functions
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

create or replace function public.is_group_admin(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = 'admin'
  );
$$;

-- Trigger for auth.users -> public.profiles & default group
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    v_name,
    new.email,
    coalesce(new.raw_app_meta_data->>'role', 'user')
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email;

  -- Create default personal group for this user
  insert into public.groups (name, description, created_by)
  values ('Jurnal Pribadi', 'Grup default untuk catatan keuangan pribadi', new.id)
  returning id into v_group_id;

  -- Add user as owner
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, new.id, 'owner');

  return new;
end;
$$;

-- Drop if exists and recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- Grants
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.categories to anon;

-- Policies for profiles
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or is_admin((select auth.uid())))
  with check ((select auth.uid()) = id or is_admin((select auth.uid())));

-- Policies for groups
create policy "groups_select" on public.groups
  for select to authenticated
  using (is_group_member(id, (select auth.uid())) or is_admin((select auth.uid())));

create policy "groups_insert" on public.groups
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "groups_update" on public.groups
  for update to authenticated
  using (is_group_admin(id, (select auth.uid())) or is_admin((select auth.uid())))
  with check (is_group_admin(id, (select auth.uid())) or is_admin((select auth.uid())));

create policy "groups_delete" on public.groups
  for delete to authenticated
  using ((select auth.uid()) = created_by or is_admin((select auth.uid())));

-- Policies for group_members
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (is_group_member(group_id, (select auth.uid())) or is_admin((select auth.uid())));

create policy "group_members_insert" on public.group_members
  for insert to authenticated
  with check (
    is_group_admin(group_id, (select auth.uid())) 
    or (select auth.uid()) in (select created_by from public.groups where id = group_id)
    or is_admin((select auth.uid()))
  );

create policy "group_members_update" on public.group_members
  for update to authenticated
  using (is_group_admin(group_id, (select auth.uid())) or is_admin((select auth.uid())))
  with check (is_group_admin(group_id, (select auth.uid())) or is_admin((select auth.uid())));

create policy "group_members_delete" on public.group_members
  for delete to authenticated
  using (
    is_group_admin(group_id, (select auth.uid())) 
    or (select auth.uid()) = user_id 
    or is_admin((select auth.uid()))
  );

-- Policies for categories
create policy "categories_select" on public.categories
  for select to authenticated
  using (
    is_system = true 
    or group_id is null 
    or is_group_member(group_id, (select auth.uid())) 
    or created_by = (select auth.uid())
    or is_admin((select auth.uid()))
  );

create policy "categories_insert" on public.categories
  for insert to authenticated
  with check (
    (group_id is not null and is_group_member(group_id, (select auth.uid())))
    or (group_id is null and (created_by = (select auth.uid()) or is_admin((select auth.uid()))))
  );

create policy "categories_update" on public.categories
  for update to authenticated
  using (created_by = (select auth.uid()) or (group_id is not null and is_group_admin(group_id, (select auth.uid()))) or is_admin((select auth.uid())));

create policy "categories_delete" on public.categories
  for delete to authenticated
  using (created_by = (select auth.uid()) or (group_id is not null and is_group_admin(group_id, (select auth.uid()))) or is_admin((select auth.uid())));

-- Policies for transactions
create policy "transactions_select" on public.transactions
  for select to authenticated
  using (is_group_member(group_id, (select auth.uid())) or is_admin((select auth.uid())));

create policy "transactions_insert" on public.transactions
  for insert to authenticated
  with check (
    is_group_member(group_id, (select auth.uid()))
    and (select auth.uid()) = created_by
  );

create policy "transactions_update" on public.transactions
  for update to authenticated
  using (
    is_group_member(group_id, (select auth.uid()))
    and ((select auth.uid()) = created_by or is_group_admin(group_id, (select auth.uid())) or is_admin((select auth.uid())))
  )
  with check (
    is_group_member(group_id, (select auth.uid()))
    and ((select auth.uid()) = created_by or is_group_admin(group_id, (select auth.uid())) or is_admin((select auth.uid())))
  );

create policy "transactions_delete" on public.transactions
  for delete to authenticated
  using (
    is_group_member(group_id, (select auth.uid()))
    and ((select auth.uid()) = created_by or is_group_admin(group_id, (select auth.uid())) or is_admin((select auth.uid())))
  );

-- Master categories seed
insert into public.categories (name, type, icon, color, is_system)
values
  -- Expense
  ('Makanan & Minuman', 'expense', 'Utensils', '#f97316', true),
  ('Transportasi', 'expense', 'Car', '#3b82f6', true),
  ('Belanja & Kebutuhan', 'expense', 'ShoppingBag', '#ec4899', true),
  ('Tagihan & Utilitas', 'expense', 'Zap', '#eab308', true),
  ('Hiburan & Rekreasi', 'expense', 'Film', '#8b5cf6', true),
  ('Kesehatan', 'expense', 'HeartPulse', '#ef4444', true),
  ('Pendidikan', 'expense', 'GraduationCap', '#06b6d4', true),
  ('Lain-lain (Pengeluaran)', 'expense', 'MoreHorizontal', '#64748b', true),
  -- Income
  ('Gaji Pokok', 'income', 'Briefcase', '#22c55e', true),
  ('Bonus & Tunjangan', 'income', 'Gift', '#10b981', true),
  ('Bisnis & Usaha', 'income', 'TrendingUp', '#14b8a6', true),
  ('Investasi & Dividen', 'income', 'Coins', '#84cc16', true),
  ('Lain-lain (Pemasukan)', 'income', 'Wallet', '#10b981', true)
on conflict do nothing;
