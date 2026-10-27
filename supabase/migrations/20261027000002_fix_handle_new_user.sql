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

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, new.id, 'owner')
  on conflict (group_id, user_id) do nothing;

  return new;
exception when others then
  raise warning 'Error in handle_new_user: %', sqlerrm;
  return new;
end;
$$;
