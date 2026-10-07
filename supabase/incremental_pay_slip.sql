-- Incentivos y descuentos del pago, y permisos que no consumen vacaciones.
-- Ejecutar en el proyecto de Supabase compartido.

create table if not exists public.employee_pay_adjustments (
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

create index if not exists idx_employee_pay_adjustments_employee
  on public.employee_pay_adjustments (employee_id, period_month desc);

alter table public.employee_pay_adjustments enable row level security;

drop policy if exists "employee_pay_adjustments_select_by_role_scope" on public.employee_pay_adjustments;
create policy "employee_pay_adjustments_select_by_role_scope"
on public.employee_pay_adjustments for select
using (public.can_view_employee(employee_id));

drop policy if exists "employee_pay_adjustments_manage_admin_only" on public.employee_pay_adjustments;
create policy "employee_pay_adjustments_manage_admin_only"
on public.employee_pay_adjustments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

alter table public.vacation_requests
  add column if not exists request_kind text not null default 'vacation';

alter table public.vacation_requests
  drop constraint if exists vacation_requests_request_kind_chk;

alter table public.vacation_requests
  add constraint vacation_requests_request_kind_chk
  check (request_kind in ('vacation', 'permission'));
