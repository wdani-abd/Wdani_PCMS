-- نظام إدارة الأملاك والعقود
-- شغّل هذا الملف داخل Supabase SQL Editor قبل التحويل من الوضع التجريبي إلى البيانات الفعلية.

create extension if not exists "pgcrypto";

create type property_type as enum ('Residential', 'Commercial', 'Mixed');
create type unit_type as enum ('Apartment', 'Shop', 'Office', 'Warehouse', 'Other');
create type unit_status as enum ('Vacant', 'Rented', 'Maintenance');
create type tenant_type as enum ('Individual', 'Company');
create type payment_frequency as enum ('Monthly', 'Quarterly', 'SemiAnnual', 'Annual');
create type contract_status as enum ('Active', 'Expired', 'Cancelled', 'PendingRenewal');
create type schedule_status as enum ('Upcoming', 'Due', 'Partial', 'Paid', 'Overdue');
create type payment_method as enum ('BankTransfer', 'Cash', 'Cheque', 'Other');
create type expense_type as enum ('Maintenance', 'Electricity', 'Water', 'Cleaning', 'GovernmentFees', 'Management', 'Other');

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

create unique index if not exists active_contract_per_unit
  on public.contracts(unit_id)
  where contract_status = 'Active' and deleted_at is null;

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

create policy "authenticated users can read property data" on public.properties for select to authenticated using (deleted_at is null);
create policy "authenticated users can read unit data" on public.units for select to authenticated using (deleted_at is null);
create policy "authenticated users can read tenant data" on public.tenants for select to authenticated using (deleted_at is null);
create policy "authenticated users can read contract data" on public.contracts for select to authenticated using (deleted_at is null);
create policy "authenticated users can read schedules" on public.payment_schedules for select to authenticated using (true);
create policy "authenticated users can read payments" on public.payments for select to authenticated using (true);
create policy "authenticated users can read expenses" on public.expenses for select to authenticated using (deleted_at is null);
create policy "users can read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());

insert into storage.buckets (id, name, public) values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;