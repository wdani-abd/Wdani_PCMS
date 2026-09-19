-- تشغيل لمرة واحدة فقط بعد إنشاء أول مستخدم من Supabase Authentication > Users.
-- استبدل القيمتين أدناه ثم شغّل الملف من Supabase SQL Editor.
-- يتوقف الملف إذا كان هناك Admin بالفعل، ولا يحذف أو يستبدل أي بيانات.

do $$
declare
  target_email text := 'REPLACE_WITH_ADMIN_EMAIL';
  target_full_name text := 'REPLACE_WITH_ADMIN_FULL_NAME';
  target_user_id uuid;
begin
  -- Serialize all first-admin attempts within the transaction.
  perform pg_advisory_xact_lock(hashtextextended('milkiya:first-admin', 0));

  if target_email = 'REPLACE_WITH_ADMIN_EMAIL'
     or target_full_name = 'REPLACE_WITH_ADMIN_FULL_NAME' then
    raise exception 'Replace target_email and target_full_name before running this script';
  end if;

  if exists (select 1 from public.profiles where role = 'Admin') then
    raise exception 'An Admin profile already exists; use the authenticated Admin workflow to manage roles';
  end if;

  select id
    into target_user_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_user_id is null then
    raise exception 'No Supabase Auth user was found for email %', target_email;
  end if;

  insert into public.profiles (id, full_name, role)
  values (target_user_id, target_full_name, 'Admin')
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'Admin',
        updated_at = now();
end;
$$;