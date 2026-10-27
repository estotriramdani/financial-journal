-- Update groups delete policy to allow group owner or creator or system admin
drop policy if exists "groups_delete" on public.groups;

create policy "groups_delete" on public.groups
  for delete to authenticated
  using (
    (select auth.uid()) = created_by 
    or is_group_admin(id, (select auth.uid())) 
    or is_admin((select auth.uid()))
  );
