-- Add foreign key from group_members.user_id to public.profiles(id) for PostgREST resource embedding
alter table public.group_members
  drop constraint if exists fk_group_members_profile,
  add constraint fk_group_members_profile
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Add foreign key from transactions.created_by to public.profiles(id) for PostgREST resource embedding
alter table public.transactions
  drop constraint if exists fk_transactions_profile,
  add constraint fk_transactions_profile
  foreign key (created_by) references public.profiles(id) on delete cascade;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
