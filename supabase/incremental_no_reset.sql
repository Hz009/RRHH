-- Incremental migration without resetting public schema.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- ============================================================================
-- Roles enum compatibility
-- ============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'employee_role'
  ) then
    create type public.employee_role as enum ('admin', 'manager', 'employee');
  else
    alter type public.employee_role add value if not exists 'admin';
    alter type public.employee_role add value if not exists 'manager';
    alter type public.employee_role add value if not exists 'employee';
  end if;
end $$;

-- ============================================================================
-- Employee profile 360 enums compatibility
-- ============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'employee_type'
  ) then
    create type public.employee_type as enum ('full_time', 'part_time', 'hourly');
  else
    alter type public.employee_type add value if not exists 'full_time';
    alter type public.employee_type add value if not exists 'part_time';
    alter type public.employee_type add value if not exists 'hourly';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_method'
  ) then
    create type public.payment_method as enum ('bank', 'paypal', 'wise');
  else
    alter type public.payment_method add value if not exists 'bank';
    alter type public.payment_method add value if not exists 'paypal';
    alter type public.payment_method add value if not exists 'wise';
  end if;
end $$;

-- ============================================================================
-- Employee code hardening (10 digits, sequence + trigger)
-- ============================================================================
alter table public.employees
  alter column vacation_days_per_year set default 30;

alter table public.employees
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists nationality text,
  add column if not exists employee_type public.employee_type not null default 'full_time',
  add column if not exists payment_method public.payment_method not null default 'bank',
  add column if not exists payment_account text;

update public.employees
set
  first_name = coalesce(nullif(first_name, ''), split_part(full_name, ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(trim(replace(full_name, split_part(full_name, ' ', 1), '')), '')
  )
where first_name is null or last_name is null;

create table if not exists public.employee_monthly_hours (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  period_month date not null,
  hours_worked numeric(8,2) not null default 0 check (hours_worked >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_month)
);

create index if not exists idx_employee_monthly_hours_employee_period
  on public.employee_monthly_hours(employee_id, period_month desc);

create table if not exists public.employee_compensation_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  effective_date date not null,
  employee_type public.employee_type not null default 'full_time',
  payment_method public.payment_method not null default 'bank',
  payment_account text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_comp_history_employee_effective
  on public.employee_compensation_history(employee_id, effective_date desc, created_at desc);

create table if not exists public.employee_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  period_month date not null,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  currency text not null default 'USD',
  payment_method public.payment_method not null default 'bank',
  payment_account text,
  employee_type public.employee_type not null default 'full_time',
  hours_worked numeric(8,2) not null default 0 check (hours_worked >= 0),
  base_amount numeric(12,2) not null default 0 check (base_amount >= 0),
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (employee_id, period_month)
);

create index if not exists idx_employee_payments_employee_period
  on public.employee_payments(employee_id, period_month desc);

create sequence if not exists public.employee_code_seq
start with 1
increment by 1
minvalue 1
no maxvalue
cache 1;

-- Keep current data, but ensure future writes are 10-digit.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'employees'
      and c.conname = 'employees_employee_code_format_chk'
  ) then
    alter table public.employees
      add constraint employees_employee_code_format_chk
      check (employee_code ~ '^[0-9]{10}$') not valid;
  end if;
end $$;

create or replace function public.assign_employee_code()
returns trigger
language plpgsql
as $$
begin
  if new.employee_code is null or btrim(new.employee_code) = '' then
    new.employee_code := lpad(nextval('public.employee_code_seq')::text, 10, '0');
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_assign_employee_code'
      and tgrelid = 'public.employees'::regclass
  ) then
    create trigger trg_assign_employee_code
    before insert on public.employees
    for each row execute function public.assign_employee_code();
  end if;
end $$;

select setval(
  'public.employee_code_seq',
  greatest(
    1,
    coalesce(
      (select max(employee_code::bigint) from public.employees where employee_code ~ '^[0-9]{10}$'),
      0
    )
  )
);

-- ============================================================================
-- New history table for job/department
-- ============================================================================
create table if not exists public.job_department_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  department text not null,
  job_title text not null,
  effective_date date not null,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_department_history_employee
  on public.job_department_history(employee_id, effective_date desc);

-- ============================================================================
-- Security-definer helper functions (prevent RLS recursion)
-- ============================================================================
create or replace function public.current_user_role()
returns public.employee_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'employee'::public.employee_role
  );
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
    from public.employees e
    join public.profiles p on p.email = e.email
   where p.id = auth.uid()
   limit 1;
$$;

create or replace function public.can_view_employee(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.current_user_role() = 'admin' then true
    when public.current_user_role() = 'manager' then (
      target_employee_id = public.current_employee_id()
      or exists (
        select 1
          from public.employees managed
         where managed.id = target_employee_id
           and managed.manager_id = public.current_employee_id()
      )
    )
    else target_employee_id = public.current_employee_id()
  end;
$$;

-- ============================================================================
-- Grants
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
grant all on sequences to anon, authenticated, service_role;

alter default privileges in schema public
grant all on routines to anon, authenticated, service_role;

-- ============================================================================
-- RLS + policies (drop old names, recreate new policy set)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.salary_history enable row level security;
alter table public.employee_compensation_history enable row level security;
alter table public.job_department_history enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.attendance_records enable row level security;
alter table public.employee_monthly_hours enable row level security;
alter table public.employee_payments enable row level security;
alter table public.documents enable row level security;
alter table public.document_acknowledgements enable row level security;
alter table public.employee_loans enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.internal_notifications enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.offboarding_tasks enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own_or_hr" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.current_user_role() = 'admin');

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "employees_select_all_authenticated" on public.employees;
drop policy if exists "employees_manage_hr_admin_manager" on public.employees;
drop policy if exists "employees_select_by_role_scope" on public.employees;
drop policy if exists "employees_manage_admin_only" on public.employees;
drop policy if exists "employees_manage_admin_or_anon_insert_dev" on public.employees;
drop policy if exists "employees_update_delete_admin_only" on public.employees;
drop policy if exists "employees_delete_admin_only" on public.employees;

create policy "employees_select_by_role_scope"
on public.employees for select
using (public.can_view_employee(id));

create policy "employees_manage_admin_only"
on public.employees for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "salary_history_select_all_authenticated" on public.salary_history;
drop policy if exists "salary_history_manage_hr_admin" on public.salary_history;
drop policy if exists "salary_history_select_by_role_scope" on public.salary_history;
drop policy if exists "salary_history_manage_admin_only" on public.salary_history;

create policy "salary_history_select_by_role_scope"
on public.salary_history for select
using (public.can_view_employee(employee_id));

create policy "salary_history_manage_admin_only"
on public.salary_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "employee_comp_history_select_by_role_scope" on public.employee_compensation_history;
drop policy if exists "employee_comp_history_manage_admin_only" on public.employee_compensation_history;

create policy "employee_comp_history_select_by_role_scope"
on public.employee_compensation_history for select
using (public.can_view_employee(employee_id));

create policy "employee_comp_history_manage_admin_only"
on public.employee_compensation_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "job_department_history_select_by_role_scope" on public.job_department_history;
drop policy if exists "job_department_history_manage_admin_only" on public.job_department_history;

create policy "job_department_history_select_by_role_scope"
on public.job_department_history for select
using (public.can_view_employee(employee_id));

create policy "job_department_history_manage_admin_only"
on public.job_department_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "vacation_requests_select_all_authenticated" on public.vacation_requests;
drop policy if exists "vacation_requests_insert_employee" on public.vacation_requests;
drop policy if exists "vacation_requests_manage_hr_admin_manager" on public.vacation_requests;
drop policy if exists "vacation_requests_select_by_role_scope" on public.vacation_requests;
drop policy if exists "vacation_requests_insert_owner_or_admin" on public.vacation_requests;
drop policy if exists "vacation_requests_update_admin_only" on public.vacation_requests;
drop policy if exists "vacation_requests_update_admin_or_manager" on public.vacation_requests;

create policy "vacation_requests_select_by_role_scope"
on public.vacation_requests for select
using (public.can_view_employee(employee_id));

create policy "vacation_requests_insert_owner_or_admin"
on public.vacation_requests for insert
with check (
  public.current_user_role() = 'admin'
  or employee_id = public.current_employee_id()
  or (public.current_user_role() = 'manager' and public.can_view_employee(employee_id))
);

create policy "vacation_requests_update_admin_or_manager"
on public.vacation_requests for update
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'manager' and public.can_view_employee(employee_id))
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'manager' and public.can_view_employee(employee_id))
);

drop policy if exists "attendance_select_all_authenticated" on public.attendance_records;
drop policy if exists "attendance_insert_authenticated" on public.attendance_records;
drop policy if exists "attendance_select_by_role_scope" on public.attendance_records;
drop policy if exists "attendance_insert_owner_or_admin" on public.attendance_records;

create policy "attendance_select_by_role_scope"
on public.attendance_records for select
using (public.can_view_employee(employee_id));

create policy "attendance_insert_owner_or_admin"
on public.attendance_records for insert
with check (public.current_user_role() = 'admin' or employee_id = public.current_employee_id());

drop policy if exists "employee_monthly_hours_select_by_role_scope" on public.employee_monthly_hours;
drop policy if exists "employee_monthly_hours_manage_admin_only" on public.employee_monthly_hours;

create policy "employee_monthly_hours_select_by_role_scope"
on public.employee_monthly_hours for select
using (public.can_view_employee(employee_id));

create policy "employee_monthly_hours_manage_admin_only"
on public.employee_monthly_hours for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "employee_payments_select_by_role_scope" on public.employee_payments;
drop policy if exists "employee_payments_manage_admin_only" on public.employee_payments;

create policy "employee_payments_select_by_role_scope"
on public.employee_payments for select
using (public.can_view_employee(employee_id));

create policy "employee_payments_manage_admin_only"
on public.employee_payments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "documents_select_authenticated" on public.documents;
drop policy if exists "documents_manage_hr_admin" on public.documents;
drop policy if exists "documents_select_by_role_scope" on public.documents;
drop policy if exists "documents_manage_admin_only" on public.documents;

create policy "documents_select_by_role_scope"
on public.documents for select
using (
  is_global = true
  or (employee_id is not null and public.can_view_employee(employee_id))
);

create policy "documents_manage_admin_only"
on public.documents for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "document_acks_select_authenticated" on public.document_acknowledgements;
drop policy if exists "document_acks_insert_authenticated" on public.document_acknowledgements;
drop policy if exists "document_acks_select_by_role_scope" on public.document_acknowledgements;
drop policy if exists "document_acks_insert_owner_or_admin" on public.document_acknowledgements;

create policy "document_acks_select_by_role_scope"
on public.document_acknowledgements for select
using (public.can_view_employee(employee_id));

create policy "document_acks_insert_owner_or_admin"
on public.document_acknowledgements for insert
with check (public.current_user_role() = 'admin' or employee_id = public.current_employee_id());

drop policy if exists "employee_loans_select_authenticated" on public.employee_loans;
drop policy if exists "employee_loans_manage_hr_admin_finance" on public.employee_loans;
drop policy if exists "employee_loans_select_by_role_scope" on public.employee_loans;
drop policy if exists "employee_loans_manage_admin_only" on public.employee_loans;

create policy "employee_loans_select_by_role_scope"
on public.employee_loans for select
using (public.can_view_employee(employee_id));

create policy "employee_loans_manage_admin_only"
on public.employee_loans for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "loan_repayments_select_authenticated" on public.loan_repayments;
drop policy if exists "loan_repayments_manage_hr_admin_finance" on public.loan_repayments;
drop policy if exists "loan_repayments_select_by_role_scope" on public.loan_repayments;
drop policy if exists "loan_repayments_manage_admin_only" on public.loan_repayments;

create policy "loan_repayments_select_by_role_scope"
on public.loan_repayments for select
using (public.can_view_employee(employee_id));

create policy "loan_repayments_manage_admin_only"
on public.loan_repayments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "audit_logs_select_hr_admin" on public.audit_logs;
drop policy if exists "audit_logs_select_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_insert_system" on public.audit_logs;
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;

create policy "audit_logs_select_admin_only"
on public.audit_logs for select
using (public.current_user_role() = 'admin');

create policy "audit_logs_insert_authenticated"
on public.audit_logs for insert
with check (auth.uid() is not null);

drop policy if exists "notifications_select_recipient_or_hr" on public.internal_notifications;
drop policy if exists "notifications_manage_hr_admin" on public.internal_notifications;
drop policy if exists "notifications_select_recipient_or_admin" on public.internal_notifications;
drop policy if exists "notifications_manage_admin_only" on public.internal_notifications;

create policy "notifications_select_recipient_or_admin"
on public.internal_notifications for select
using (recipient_profile_id = auth.uid() or public.current_user_role() = 'admin');

create policy "notifications_manage_admin_only"
on public.internal_notifications for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "onboarding_select_authenticated" on public.onboarding_tasks;
drop policy if exists "onboarding_manage_hr_admin_manager" on public.onboarding_tasks;
drop policy if exists "onboarding_select_by_role_scope" on public.onboarding_tasks;
drop policy if exists "onboarding_manage_admin_only" on public.onboarding_tasks;

create policy "onboarding_select_by_role_scope"
on public.onboarding_tasks for select
using (public.can_view_employee(employee_id));

create policy "onboarding_manage_admin_only"
on public.onboarding_tasks for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "offboarding_select_authenticated" on public.offboarding_tasks;
drop policy if exists "offboarding_manage_hr_admin_manager" on public.offboarding_tasks;
drop policy if exists "offboarding_select_by_role_scope" on public.offboarding_tasks;
drop policy if exists "offboarding_manage_admin_only" on public.offboarding_tasks;

create policy "offboarding_select_by_role_scope"
on public.offboarding_tasks for select
using (public.can_view_employee(employee_id));

create policy "offboarding_manage_admin_only"
on public.offboarding_tasks for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- ============================================================================
-- Monthly bonuses (per day in month, locked after payroll registered)
-- ============================================================================
create table if not exists public.employee_monthly_bonuses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  period_month date not null,
  bonus_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  concept text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_monthly_bonuses_bonus_in_period_chk
    check (date_trunc('month', bonus_date)::date = period_month)
);

create index if not exists idx_employee_monthly_bonuses_employee_period
  on public.employee_monthly_bonuses(employee_id, period_month desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_employee_monthly_bonuses_updated_at'
      and tgrelid = 'public.employee_monthly_bonuses'::regclass
  ) then
    create trigger trg_employee_monthly_bonuses_updated_at
    before update on public.employee_monthly_bonuses
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.employee_monthly_bonuses enable row level security;

drop policy if exists "employee_monthly_bonuses_select_by_role_scope" on public.employee_monthly_bonuses;
drop policy if exists "employee_monthly_bonuses_manage_admin_only" on public.employee_monthly_bonuses;

create policy "employee_monthly_bonuses_select_by_role_scope"
on public.employee_monthly_bonuses for select
using (public.can_view_employee(employee_id));

create policy "employee_monthly_bonuses_manage_admin_only"
on public.employee_monthly_bonuses for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- ============================================================================
-- Seed compatibility with existing auth users (non-destructive upsert)
-- ============================================================================
insert into public.profiles (id, full_name, email, role)
select u.id, 'System Admin', 'admin@test.com', 'admin'::public.employee_role
from auth.users u
where u.email = 'admin@test.com'
on conflict (id) do update
set full_name = excluded.full_name, email = excluded.email, role = excluded.role;

insert into public.profiles (id, full_name, email, role)
select u.id, 'Main Manager', 'manager@test.com', 'manager'::public.employee_role
from auth.users u
where u.email = 'manager@test.com'
on conflict (id) do update
set full_name = excluded.full_name, email = excluded.email, role = excluded.role;

insert into public.profiles (id, full_name, email, role)
select u.id, 'Main Employee', 'employee@test.com', 'employee'::public.employee_role
from auth.users u
where u.email = 'employee@test.com'
on conflict (id) do update
set full_name = excluded.full_name, email = excluded.email, role = excluded.role;

-- ============================================================================
-- Employee: residencia, datos bancarios y domicilio de pago
-- ============================================================================
alter table public.employees add column if not exists residence_country text;
alter table public.employees add column if not exists legal_name_bank text;
alter table public.employees add column if not exists identity_document text;
alter table public.employees add column if not exists address_line text;
alter table public.employees add column if not exists address_country text;
alter table public.employees add column if not exists address_city text;
alter table public.employees add column if not exists address_postal_code text;
alter table public.employees add column if not exists bank_name text;
alter table public.employees add column if not exists bank_account_number text;
alter table public.employees add column if not exists swift_bic text;
alter table public.employees add column if not exists bank_route_number text;
alter table public.employees add column if not exists paypal_email text;
alter table public.employees add column if not exists invoice_currency text;

-- ============================================================================
-- Horas por horas: fichaje vs carga mensual + bolsa de horas (FT/PT)
-- ============================================================================
alter table public.employees add column if not exists hourly_hours_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'employees' and c.conname = 'employees_hourly_hours_source_chk'
  ) then
    alter table public.employees
      add constraint employees_hourly_hours_source_chk
      check (
        hourly_hours_source is null
        or hourly_hours_source in ('punch', 'manual_monthly')
      );
  end if;
end $$;

update public.employees
set hourly_hours_source = 'manual_monthly'
where employee_type = 'hourly' and hourly_hours_source is null;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'hours_balance_kind'
  ) then
    create type public.hours_balance_kind as enum ('grant', 'use', 'repay', 'adjustment');
  end if;
end $$;

create table if not exists public.employee_hours_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  occurred_at date not null default (timezone('utc', now()))::date,
  delta_hours numeric(8,2) not null check (delta_hours <> 0),
  kind public.hours_balance_kind not null,
  reason text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hours_balance_ledger_employee
  on public.employee_hours_balance_ledger(employee_id, occurred_at desc);

alter table public.employee_hours_balance_ledger enable row level security;

drop policy if exists "hours_balance_ledger_select_by_role_scope" on public.employee_hours_balance_ledger;
drop policy if exists "hours_balance_ledger_manage_admin_only" on public.employee_hours_balance_ledger;

create policy "hours_balance_ledger_select_by_role_scope"
on public.employee_hours_balance_ledger for select
using (public.can_view_employee(employee_id));

create policy "hours_balance_ledger_manage_admin_only"
on public.employee_hours_balance_ledger for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "attendance_delete_admin_only" on public.attendance_records;
create policy "attendance_delete_admin_only"
on public.attendance_records for delete
using (public.current_user_role() = 'admin');

