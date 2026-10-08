-- LinguaMeeting HRIS schema (Back Office)
-- Run this file in Supabase SQL editor.

create extension if not exists pgcrypto;

-- ==========================================
-- Enums
-- ==========================================
create type public.employee_role as enum ('admin', 'manager', 'employee');
create type public.employment_status as enum ('active', 'on_leave', 'inactive');
create type public.employee_type as enum ('full_time', 'part_time', 'hourly');
create type public.payment_method as enum ('bank', 'paypal', 'wise');
create type public.loan_status as enum ('draft', 'active', 'paid', 'defaulted', 'cancelled');
create type public.vacation_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.document_category as enum ('contract', 'policy', 'evaluation', 'payroll', 'other');
create type public.attendance_event_type as enum ('clock_in', 'clock_out', 'break_start', 'break_end');
create type public.hours_balance_kind as enum ('grant', 'use', 'repay', 'adjustment');

-- ==========================================
-- Shared utility functions
-- ==========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==========================================
-- Profiles (auth bridge + app role)
-- ==========================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.employee_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ==========================================
-- Core HR tables
-- ==========================================
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique check (employee_code ~ '^[0-9]{10}$'),
  full_name text not null,
  first_name text,
  last_name text,
  email text not null unique,
  phone text,
  phone_prefix text,
  whatsapp_prefix text,
  whatsapp_number text,
  nationality text,
  residence_country text,
  legal_name_bank text,
  identity_document text,
  address_line text,
  address_country text,
  address_city text,
  address_postal_code text,
  bank_name text,
  bank_account_number text,
  bank_account_type text check (bank_account_type is null or bank_account_type in ('savings', 'checking')),
  swift_bic text,
  bank_route_number text,
  paypal_email text,
  invoice_currency text,
  employee_type public.employee_type not null default 'full_time',
  hourly_hours_source text check (hourly_hours_source is null or hourly_hours_source in ('punch', 'manual_monthly')),
  payment_method public.payment_method,
  payment_account text,
  department text not null,
  job_title text not null,
  manager_id uuid references public.employees (id) on delete set null,
  hire_date date not null,
  employment_status public.employment_status not null default 'active',
  current_salary_amount numeric(12,2) not null default 0,
  current_salary_currency text not null default 'USD',
  current_salary_effective_date date,
  vacation_days_per_year integer not null default 30,
  vacation_days_used integer not null default 0,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.employee_code_seq
start with 1
increment by 1
minvalue 1
no maxvalue
cache 1;

create index idx_employees_department on public.employees(department);
create index idx_employees_status on public.employees(employment_status);
create index idx_employees_manager_id on public.employees(manager_id);

create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

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

create trigger trg_assign_employee_code
before insert on public.employees
for each row execute function public.assign_employee_code();

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
  with recursive team as (
    select id, 0 as depth
      from public.employees
     where id = public.current_employee_id()
    union all
    select child.id, team.depth + 1
      from public.employees child
      join team on child.manager_id = team.id
     where team.depth < 20
  )
  select case
    when auth.uid() is null then false
    when public.current_user_role() = 'admin' then true
    when public.current_user_role() = 'manager' then exists (
      select 1 from team where team.id = target_employee_id
    )
    else target_employee_id = public.current_employee_id()
  end;
$$;

create table public.salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  effective_date date not null,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_salary_history_employee on public.salary_history(employee_id, effective_date desc);

create table public.employee_compensation_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  effective_date date not null,
  employee_type public.employee_type not null default 'full_time',
  payment_method public.payment_method,
  payment_account text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_employee_comp_history_employee_effective
  on public.employee_compensation_history(employee_id, effective_date desc, created_at desc);

create table public.job_department_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  department text not null,
  job_title text not null,
  effective_date date not null,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_job_department_history_employee
  on public.job_department_history(employee_id, effective_date desc);

create or replace function public.sync_employee_current_salary()
returns trigger
language plpgsql
as $$
begin
  update public.employees
     set current_salary_amount = new.amount,
         current_salary_currency = new.currency,
         current_salary_effective_date = new.effective_date,
         updated_at = now()
   where id = new.employee_id;
  return new;
end;
$$;

create trigger trg_sync_employee_current_salary
after insert on public.salary_history
for each row execute function public.sync_employee_current_salary();

create table public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_requested numeric(5,2) not null check (days_requested > 0),
  request_status public.vacation_request_status not null default 'pending',
  reason text,
  request_kind text not null default 'vacation' check (request_kind in ('vacation', 'permission')),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_vacation_requests_employee on public.vacation_requests(employee_id);
create index idx_vacation_requests_status on public.vacation_requests(request_status);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  event_type public.attendance_event_type not null,
  occurred_at timestamptz not null,
  source text not null default 'web',
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_attendance_employee_time on public.attendance_records(employee_id, occurred_at desc);

create table public.employee_hours_balance_ledger (
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

create index idx_hours_balance_ledger_employee
  on public.employee_hours_balance_ledger(employee_id, occurred_at desc);

create table public.employee_monthly_hours (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  period_month date not null,
  hours_worked numeric(8,2) not null default 0 check (hours_worked >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_month)
);

create index idx_employee_monthly_hours_employee_period
  on public.employee_monthly_hours(employee_id, period_month desc);

create table public.employee_payments (
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

create index idx_employee_payments_employee_period
  on public.employee_payments(employee_id, period_month desc);

create table public.employee_monthly_bonuses (
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

create index idx_employee_monthly_bonuses_employee_period
  on public.employee_monthly_bonuses(employee_id, period_month desc);

create trigger trg_employee_monthly_bonuses_updated_at
before update on public.employee_monthly_bonuses
for each row execute function public.set_updated_at();

create table public.employee_pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  kind text not null check (kind in ('incentive', 'discount')),
  adjustment_type text not null,
  comment text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  recurrence text not null check (recurrence in ('once', 'monthly')),
  period_month date not null,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employee_pay_adjustments_employee
  on public.employee_pay_adjustments (employee_id, period_month desc);

-- ==========================================
-- Documents and acknowledgements
-- ==========================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete cascade,
  title text not null,
  category public.document_category not null default 'other',
  file_path text not null,
  requires_ack boolean not null default false,
  is_global boolean not null default false,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_documents_employee on public.documents(employee_id);
create index idx_documents_global on public.documents(is_global);

create table public.document_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (document_id, employee_id)
);

-- ==========================================
-- Loans
-- ==========================================
create table public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  description text not null,
  principal_amount numeric(12,2) not null check (principal_amount > 0),
  currency text not null default 'USD',
  installments_total integer not null check (installments_total > 0),
  installments_paid integer not null default 0 check (installments_paid >= 0),
  installment_amount numeric(12,2) not null check (installment_amount > 0),
  start_date date not null,
  payroll_deduction_enabled boolean not null default false,
  payroll_deduction_code text,
  outstanding_balance numeric(12,2) not null check (outstanding_balance >= 0),
  status public.loan_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employee_loans_employee on public.employee_loans(employee_id);
create index idx_employee_loans_status on public.employee_loans(status);

create trigger trg_employee_loans_updated_at
before update on public.employee_loans
for each row execute function public.set_updated_at();

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.employee_loans (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  source text not null default 'manual',
  payroll_period text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_loan_repayments_loan on public.loan_repayments(loan_id, paid_on desc);

create or replace function public.sync_loan_balance()
returns trigger
language plpgsql
as $$
declare
  v_total_paid numeric(12,2);
  v_principal numeric(12,2);
  v_installments_paid integer;
begin
  select coalesce(sum(amount), 0)
    into v_total_paid
    from public.loan_repayments
   where loan_id = new.loan_id;

  select principal_amount
    into v_principal
    from public.employee_loans
   where id = new.loan_id;

  select count(*)
    into v_installments_paid
    from public.loan_repayments
   where loan_id = new.loan_id;

  update public.employee_loans
     set outstanding_balance = greatest(v_principal - v_total_paid, 0),
         installments_paid = v_installments_paid,
         status = case when (v_principal - v_total_paid) <= 0 then 'paid'::public.loan_status else status end,
         updated_at = now()
   where id = new.loan_id;

  return new;
end;
$$;

create trigger trg_sync_loan_balance
after insert on public.loan_repayments
for each row execute function public.sync_loan_balance();

-- ==========================================
-- Cross-module support tables
-- ==========================================
create table public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  module text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  task_name text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.offboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  task_name text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  module text not null,
  action text not null,
  entity_name text not null,
  entity_id text not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_module on public.audit_logs(module);
create index idx_audit_logs_entity on public.audit_logs(entity_name, entity_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ==========================================
-- Grants for Supabase API roles
-- ==========================================
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

-- ==========================================
-- RLS
-- ==========================================
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.salary_history enable row level security;
alter table public.employee_compensation_history enable row level security;
alter table public.job_department_history enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.attendance_records enable row level security;
alter table public.employee_hours_balance_ledger enable row level security;
alter table public.employee_monthly_hours enable row level security;
alter table public.employee_payments enable row level security;
alter table public.employee_monthly_bonuses enable row level security;
alter table public.documents enable row level security;
alter table public.document_acknowledgements enable row level security;
alter table public.employee_loans enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.internal_notifications enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.offboarding_tasks enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.current_user_role() = 'admin');

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

-- Employees and salary
create policy "employees_select_by_role_scope"
on public.employees for select
using (public.can_view_employee(id));

create policy "employees_manage_admin_only"
on public.employees for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "salary_history_select_by_role_scope"
on public.salary_history for select
using (public.can_view_employee(employee_id));

create policy "salary_history_manage_admin_only"
on public.salary_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "employee_comp_history_select_by_role_scope"
on public.employee_compensation_history for select
using (public.can_view_employee(employee_id));

create policy "employee_comp_history_manage_admin_only"
on public.employee_compensation_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "job_department_history_select_by_role_scope"
on public.job_department_history for select
using (public.can_view_employee(employee_id));

create policy "job_department_history_manage_admin_only"
on public.job_department_history for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Vacations and attendance
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

create policy "attendance_select_by_role_scope"
on public.attendance_records for select
using (public.can_view_employee(employee_id));

create policy "attendance_insert_owner_or_admin"
on public.attendance_records for insert
with check (public.current_user_role() = 'admin' or employee_id = public.current_employee_id());

create policy "attendance_delete_admin_only"
on public.attendance_records for delete
using (public.current_user_role() = 'admin');

create policy "hours_balance_ledger_select_by_role_scope"
on public.employee_hours_balance_ledger for select
using (public.can_view_employee(employee_id));

create policy "hours_balance_ledger_manage_admin_only"
on public.employee_hours_balance_ledger for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "employee_monthly_hours_select_by_role_scope"
on public.employee_monthly_hours for select
using (public.can_view_employee(employee_id));

create policy "employee_monthly_hours_manage_admin_only"
on public.employee_monthly_hours for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "employee_payments_select_by_role_scope"
on public.employee_payments for select
using (public.can_view_employee(employee_id));

create policy "employee_payments_manage_admin_only"
on public.employee_payments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "employee_monthly_bonuses_select_by_role_scope"
on public.employee_monthly_bonuses for select
using (public.can_view_employee(employee_id));

create policy "employee_monthly_bonuses_manage_admin_only"
on public.employee_monthly_bonuses for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

alter table public.employee_pay_adjustments enable row level security;

create policy "employee_pay_adjustments_select_by_role_scope"
on public.employee_pay_adjustments for select
using (public.can_view_employee(employee_id));

create policy "employee_pay_adjustments_manage_admin_only"
on public.employee_pay_adjustments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Documents
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

create policy "document_acks_select_by_role_scope"
on public.document_acknowledgements for select
using (public.can_view_employee(employee_id));

create policy "document_acks_insert_owner_or_admin"
on public.document_acknowledgements for insert
with check (public.current_user_role() = 'admin' or employee_id = public.current_employee_id());

-- Loans
create policy "employee_loans_select_by_role_scope"
on public.employee_loans for select
using (public.can_view_employee(employee_id));

create policy "employee_loans_manage_admin_only"
on public.employee_loans for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "loan_repayments_select_by_role_scope"
on public.loan_repayments for select
using (public.can_view_employee(employee_id));

create policy "loan_repayments_manage_admin_only"
on public.loan_repayments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Audit and support tables
create policy "audit_logs_select_admin_only"
on public.audit_logs for select
using (public.current_user_role() = 'admin');

create policy "audit_logs_insert_authenticated"
on public.audit_logs for insert
with check (auth.uid() is not null);

create policy "notifications_select_recipient_or_admin"
on public.internal_notifications for select
using (recipient_profile_id = auth.uid() or public.current_user_role() = 'admin');

create policy "notifications_manage_admin_only"
on public.internal_notifications for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "onboarding_select_by_role_scope"
on public.onboarding_tasks for select
using (public.can_view_employee(employee_id));

create policy "onboarding_manage_admin_only"
on public.onboarding_tasks for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "offboarding_select_by_role_scope"
on public.offboarding_tasks for select
using (public.can_view_employee(employee_id));

create policy "offboarding_manage_admin_only"
on public.offboarding_tasks for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- ==========================================
-- Storage bucket for HR documents
-- ==========================================
insert into storage.buckets (id, name, public)
values ('hr-documents', 'hr-documents', false)
on conflict (id) do nothing;
