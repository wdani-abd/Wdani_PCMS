-- نظام إدارة الأملاك والعقود
-- شغّل هذا الملف داخل Supabase SQL Editor قبل تشغيل التطبيق، ثم شغّل seed.sql في بيئة الاختبار.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

do $$ begin
  create type public.property_type as enum ('Residential', 'Commercial', 'Mixed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.unit_type as enum ('Apartment', 'Shop', 'Office', 'Warehouse', 'Other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.unit_status as enum ('Vacant', 'Rented', 'Maintenance');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tenant_type as enum ('Individual', 'Company');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_frequency as enum ('Monthly', 'Quarterly', 'SemiAnnual', 'Annual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.contract_status as enum ('Active', 'Expired', 'Cancelled', 'PendingRenewal');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.schedule_status as enum ('Upcoming', 'Due', 'Partial', 'Paid', 'Overdue');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('BankTransfer', 'Cash', 'Cheque', 'Other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.expense_type as enum ('Maintenance', 'Electricity', 'Water', 'Cleaning', 'GovernmentFees', 'Management', 'Other');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'Property Manager' check (role in ('Admin', 'Property Manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_type property_type not null,
  city text not null,
  district text not null,
  location_description text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  unit_number text not null,
  unit_name text not null,
  unit_type unit_type not null,
  floor text,
  area numeric(12,2),
  expected_rent numeric(14,2) not null default 0,
  status unit_status not null default 'Vacant',
  electricity_meter_number text,
  water_meter_number text,
  gas_meter_number text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, unit_number)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_type tenant_type not null,
  name text not null,
  national_id text,
  mobile text not null,
  email text,
  company_name text,
  commercial_registration text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  tenant_id uuid not null references public.tenants(id),
  unit_id uuid not null references public.units(id),
  start_date date not null,
  end_date date not null,
  annual_rent numeric(14,2) not null,
  payment_frequency payment_frequency not null,
  security_deposit numeric(14,2) not null default 0,
  contract_status contract_status not null default 'Active',
  notes text,
  contract_file_path text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_no_overlapping_effective_periods'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_no_overlapping_effective_periods
      exclude using gist (
        unit_id with =,
        daterange(start_date, end_date, '[]') with &&
      )
      where (
        contract_status in ('Active', 'PendingRenewal')
        and deleted_at is null
      );
  end if;
end $$;

create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  due_date date not null,
  amount_due numeric(14,2) not null,
  amount_paid numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) generated always as (greatest(amount_due - amount_paid, 0)) stored,
  status schedule_status not null default 'Upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_schedule_id uuid not null references public.payment_schedules(id),
  contract_id uuid not null references public.contracts(id),
  tenant_id uuid not null references public.tenants(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  payment_method payment_method not null,
  bank_name text,
  reference_number text,
  receipt_path text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  unit_id uuid references public.units(id),
  expense_type expense_type not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null,
  beneficiary text not null,
  invoice_path text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null,
  title text not null,
  description text not null,
  priority text not null default 'medium',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists properties_search_idx on public.properties using gin (to_tsvector('simple', name || ' ' || city || ' ' || district));
create index if not exists units_property_idx on public.units(property_id);
create index if not exists units_search_idx on public.units(unit_number, electricity_meter_number, water_meter_number);
create index if not exists tenants_search_idx on public.tenants(name, national_id, mobile);
create index if not exists contracts_tenant_idx on public.contracts(tenant_id);
create index if not exists contracts_unit_idx on public.contracts(unit_id);
create index if not exists schedules_due_idx on public.payment_schedules(due_date, status);
create index if not exists payments_date_idx on public.payments(payment_date);
create index if not exists expenses_date_idx on public.expenses(expense_date);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.contracts enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

insert into storage.buckets (id, name, public) values ('property-documents', 'property-documents', false)
on conflict (id) do update set public = false;

revoke create on schema public from public, anon, authenticated;

-- دوال الصلاحيات. SECURITY DEFINER يمنع الدور الحالي من الالتفاف على RLS في profiles.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_profile_role() = any(allowed_roles), false)
$$;

create or replace function public.is_authorized_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(array['Admin', 'Property Manager'])
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.has_role(text[]) from public;
revoke all on function public.is_authorized_staff() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.has_role(text[]) to authenticated;
grant execute on function public.is_authorized_staff() to authenticated;

-- يمنع المستخدم من ترقية دوره ذاتيًا مع السماح له بتعديل بيانات ملفه الشخصي.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id <> old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  if new.role <> old.role and not public.has_role(array['Admin']) then
    raise exception 'Only an Admin can change profile roles';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  create trigger profiles_protect_role
    before update on public.profiles
    for each row execute function public.protect_profile_role();
exception when duplicate_object then null; end $$;

-- اشتقاق مبلغ وحالة الاستحقاق من المدفوعات الفعلية، وليس من قيمة يرسلها العميل.
create or replace function public.normalize_payment_schedule()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  paid_total numeric(14,2);
begin
  select coalesce(sum(p.amount), 0)
    into paid_total
  from public.payments p
  where p.payment_schedule_id = new.id;

  new.amount_paid := paid_total;
  new.status := case
    when paid_total >= new.amount_due then 'Paid'::public.schedule_status
    when new.due_date < current_date then 'Overdue'::public.schedule_status
    when paid_total > 0 then 'Partial'::public.schedule_status
    when new.due_date = current_date then 'Due'::public.schedule_status
    else 'Upcoming'::public.schedule_status
  end;
  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  create trigger payment_schedules_normalize
    before insert or update on public.payment_schedules
    for each row execute function public.normalize_payment_schedule();
exception when duplicate_object then null; end $$;

-- يقفل الاستحقاق أثناء التسجيل لمنع الدفع الزائد عند وصول عمليتين بالتزامن.
create or replace function public.validate_payment_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  schedule_due numeric(14,2);
  schedule_contract_id uuid;
  schedule_tenant_id uuid;
  paid_total numeric(14,2);
begin
  if tg_op = 'UPDATE' and new.payment_schedule_id <> old.payment_schedule_id then
    raise exception 'A payment cannot be moved to another schedule';
  end if;

  select ps.amount_due, ps.contract_id, c.tenant_id
    into schedule_due, schedule_contract_id, schedule_tenant_id
  from public.payment_schedules ps
  join public.contracts c on c.id = ps.contract_id
  where ps.id = new.payment_schedule_id
  for update of ps;

  if not found then
    raise exception 'Payment schedule not found';
  end if;

  select coalesce(sum(p.amount), 0)
    into paid_total
  from public.payments p
  where p.payment_schedule_id = new.payment_schedule_id
    and (tg_op <> 'UPDATE' or p.id <> old.id);

  if new.amount <= 0 or paid_total + new.amount > schedule_due then
    raise exception 'Payment exceeds the remaining schedule amount';
  end if;

  new.contract_id := schedule_contract_id;
  new.tenant_id := schedule_tenant_id;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_schedule_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_schedule_id uuid;
begin
  affected_schedule_id := case when tg_op = 'DELETE' then old.payment_schedule_id else new.payment_schedule_id end;
  update public.payment_schedules
  set updated_at = now()
  where id = affected_schedule_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.lock_schedule_before_payment_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.payment_schedules
  where id = old.payment_schedule_id
  for update;

  if not found then
    raise exception 'Payment schedule not found';
  end if;
  return old;
end;
$$;

do $$ begin
  create trigger payments_validate
    before insert or update on public.payments
    for each row execute function public.validate_payment_write();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger payments_lock_schedule_before_delete
    before delete on public.payments
    for each row execute function public.lock_schedule_before_payment_delete();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger payments_refresh_schedule
    after insert or update or delete on public.payments
    for each row execute function public.refresh_schedule_after_payment();
exception when duplicate_object then null; end $$;

-- مزامنة حالة الوحدة عند أي تغيير على العقود.
create or replace function public.sync_unit_status(target_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.units u
  set status = case
      when exists (
        select 1
        from public.contracts c
        where c.unit_id = target_unit_id
          and c.contract_status in ('Active', 'PendingRenewal')
          and c.deleted_at is null
          and current_date between c.start_date and c.end_date
      ) then 'Rented'::public.unit_status
      when u.status = 'Rented' then 'Vacant'::public.unit_status
      else u.status
    end,
    updated_at = now()
  where u.id = target_unit_id;
end;
$$;

create or replace function public.sync_unit_status_from_contract()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.sync_unit_status(old.unit_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_unit_status(new.unit_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.normalize_unit_status_on_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.contracts c
    where c.unit_id = new.id
      and c.contract_status in ('Active', 'PendingRenewal')
      and c.deleted_at is null
      and current_date between c.start_date and c.end_date
  ) then
    new.status := 'Rented'::public.unit_status;
  elsif new.status = 'Rented' then
    new.status := 'Vacant'::public.unit_status;
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger units_normalize_contract_status
    before insert or update of status on public.units
    for each row execute function public.normalize_unit_status_on_write();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger contracts_sync_unit_status
    after insert or update or delete on public.contracts
    for each row execute function public.sync_unit_status_from_contract();
exception when duplicate_object then null; end $$;

-- سجل تدقيق غير قابل للكتابة المباشرة من العميل.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_id uuid;
begin
  row_id := case
    when tg_op = 'DELETE' then (to_jsonb(old)->>'id')::uuid
    else (to_jsonb(new)->>'id')::uuid
  end;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    row_id,
    jsonb_build_object('schema', tg_table_schema)
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public;
revoke all on function public.normalize_payment_schedule() from public;
revoke all on function public.validate_payment_write() from public;
revoke all on function public.refresh_schedule_after_payment() from public;
revoke all on function public.lock_schedule_before_payment_delete() from public;
revoke all on function public.sync_unit_status(uuid) from public;
revoke all on function public.sync_unit_status_from_contract() from public;
revoke all on function public.normalize_unit_status_on_write() from public;
revoke all on function public.write_audit_log() from public;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'profiles', 'properties', 'units', 'tenants', 'contracts',
    'payment_schedules', 'payments', 'expenses', 'notifications'
  ]
  loop
    trigger_name := table_name || '_audit_changes';
    if not exists (
      select 1 from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('public.%I', table_name)::regclass
        and not tgisinternal
    ) then
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$$;

-- صلاحيات SQL الأساسية؛ RLS أدناه يحدد الصفوف والعمليات المتاحة لكل دور.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.properties,
  public.units,
  public.tenants,
  public.contracts,
  public.payment_schedules,
  public.payments,
  public.expenses,
  public.notifications
to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

-- profiles: الملف الشخصي لصاحبه، وإدارة كاملة للـ Admin فقط.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_self_or_admin') then
    create policy profiles_select_self_or_admin on public.profiles
      for select to authenticated
      using (id = auth.uid() or public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_admin_only') then
    create policy profiles_insert_admin_only on public.profiles
      for insert to authenticated
      with check (public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_self_or_admin') then
    create policy profiles_update_self_or_admin on public.profiles
      for update to authenticated
      using (id = auth.uid() or public.has_role(array['Admin']))
      with check (id = auth.uid() or public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_admin_remove') then
    create policy profiles_admin_remove on public.profiles
      for delete to authenticated
      using (public.has_role(array['Admin']));
  end if;
end $$;

-- بيانات التشغيل: Admin وProperty Manager يستطيعان CRUD، مع إخفاء السجلات المحذوفة منطقيًا عند القراءة.
do $$
declare
  table_name text;
  select_filter text;
begin
  foreach table_name in array array['properties', 'units', 'tenants', 'contracts', 'expenses']
  loop
    select_filter := 'public.is_authorized_staff() and deleted_at is null';
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = 'staff_select_active_rows'
    ) then
      execute format(
        'create policy staff_select_active_rows on public.%I for select to authenticated using (%s)',
        table_name,
        select_filter
      );
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = 'staff_insert_rows'
    ) then
      execute format(
        'create policy staff_insert_rows on public.%I for insert to authenticated with check (public.is_authorized_staff())',
        table_name
      );
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = 'staff_update_rows'
    ) then
      execute format(
        'create policy staff_update_rows on public.%I for update to authenticated using (public.is_authorized_staff()) with check (public.is_authorized_staff())',
        table_name
      );
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = 'staff_remove_rows'
    ) then
      execute format(
        'create policy staff_remove_rows on public.%I for delete to authenticated using (public.is_authorized_staff())',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- جداول السداد: المدير العقاري ينشئ ويقرأ، والـ Admin وحده يعدّل أو يحذف.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_schedules' and policyname = 'staff_select_schedules') then
    create policy staff_select_schedules on public.payment_schedules
      for select to authenticated using (public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_schedules' and policyname = 'staff_insert_schedules') then
    create policy staff_insert_schedules on public.payment_schedules
      for insert to authenticated with check (public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_schedules' and policyname = 'admin_manage_schedules') then
    create policy admin_manage_schedules on public.payment_schedules
      for update to authenticated
      using (public.has_role(array['Admin']))
      with check (public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_schedules' and policyname = 'admin_remove_schedules') then
    create policy admin_remove_schedules on public.payment_schedules
      for delete to authenticated using (public.has_role(array['Admin']));
  end if;
end $$;

-- المدفوعات: Property Manager يسجل ويقرأ؛ تعديل أو حذف دفعة محصور في Admin.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'staff_select_payments') then
    create policy staff_select_payments on public.payments
      for select to authenticated using (public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'staff_insert_payments') then
    create policy staff_insert_payments on public.payments
      for insert to authenticated with check (public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'admin_update_payments') then
    create policy admin_update_payments on public.payments
      for update to authenticated
      using (public.has_role(array['Admin']))
      with check (public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'admin_remove_payments') then
    create policy admin_remove_payments on public.payments
      for delete to authenticated using (public.has_role(array['Admin']));
  end if;
end $$;

-- التنبيهات: المستخدم يدير تنبيهاته فقط، والـ Admin يستطيع إدارتها كلها.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_own_select') then
    create policy notifications_own_select on public.notifications
      for select to authenticated using (user_id = auth.uid() or public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_own_update') then
    create policy notifications_own_update on public.notifications
      for update to authenticated
      using (user_id = auth.uid() or public.has_role(array['Admin']))
      with check (user_id = auth.uid() or public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_admin_insert') then
    create policy notifications_admin_insert on public.notifications
      for insert to authenticated with check (public.has_role(array['Admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_admin_remove') then
    create policy notifications_admin_remove on public.notifications
      for delete to authenticated using (public.has_role(array['Admin']));
  end if;
end $$;

-- audit_logs: القراءة للـ Admin فقط، ولا توجد سياسة كتابة مباشرة من authenticated.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'audit_logs_admin_select') then
    create policy audit_logs_admin_select on public.audit_logs
      for select to authenticated using (public.has_role(array['Admin']));
  end if;
end $$;

-- Storage الخاص بمستندات العقارات. bucket خاص وكل العمليات تتطلب دورًا مصرحًا.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'property_documents_staff_select') then
    create policy property_documents_staff_select on storage.objects
      for select to authenticated
      using (bucket_id = 'property-documents' and public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'property_documents_staff_insert') then
    create policy property_documents_staff_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'property-documents' and public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'property_documents_staff_update') then
    create policy property_documents_staff_update on storage.objects
      for update to authenticated
      using (bucket_id = 'property-documents' and public.is_authorized_staff())
      with check (bucket_id = 'property-documents' and public.is_authorized_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'property_documents_staff_remove') then
    create policy property_documents_staff_remove on storage.objects
      for delete to authenticated
      using (bucket_id = 'property-documents' and public.is_authorized_staff());
  end if;
end $$;