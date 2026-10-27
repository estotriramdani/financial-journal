-- Fix groups select policy so group creator can always SELECT newly created groups
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or is_group_member(id, (select auth.uid()))
    or is_admin((select auth.uid()))
  );

-- Auto-add creator as owner in group_members via trigger
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- Also ensure transactions_select allows creator to select
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or is_group_member(group_id, (select auth.uid()))
    or is_admin((select auth.uid()))
  );
