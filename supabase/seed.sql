-- LinguaMeeting HRIS seed data
-- Execute after schema.sql

-- Profiles based on existing auth.users
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

-- Employees
insert into public.employees (
  id, employee_code, full_name, email, phone, department, job_title, manager_id, hire_date,
  employment_status, current_salary_amount, current_salary_currency, current_salary_effective_date,
  vacation_days_per_year, vacation_days_used, notes, created_by, updated_by
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '0000000001', 'System Admin', 'admin@test.com', '+1-555-1001',
    'Management', 'Administrator', null, '2022-01-10', 'active', 68000, 'USD', '2025-01-01',
    22, 5, 'Global admin account.', (select id from public.profiles where email = 'admin@test.com'),
    (select id from public.profiles where email = 'admin@test.com')
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '0000000002', 'Main Manager', 'manager@test.com', '+1-555-1002',
    'Operations', 'Operations Manager', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2022-05-16', 'active', 64000, 'USD', '2025-01-01',
    20, 3, 'Manages assigned employees.', (select id from public.profiles where email = 'admin@test.com'),
    (select id from public.profiles where email = 'admin@test.com')
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '0000000003', 'Main Employee', 'employee@test.com', '+1-555-1003',
    'Finance', 'Payroll Specialist', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2023-09-04', 'active', 52000, 'USD', '2025-01-01',
    18, 2, 'Assigned to manager account.', (select id from public.profiles where email = 'admin@test.com'),
    (select id from public.profiles where email = 'admin@test.com')
  )
on conflict (id) do nothing;

-- Salary history
insert into public.salary_history (employee_id, amount, currency, effective_date, reason, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 62000, 'USD', '2024-01-01', 'Annual increase', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 68000, 'USD', '2025-01-01', 'Promotion adjustment', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 60000, 'USD', '2024-01-01', 'Annual increase', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 64000, 'USD', '2025-01-01', 'Merit increase', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 48000, 'USD', '2024-01-01', 'Market adjustment', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 52000, 'USD', '2025-01-01', 'Annual increase', (select id from public.profiles where email = 'admin@test.com'));

-- Job and department history
insert into public.job_department_history (employee_id, department, job_title, effective_date, reason, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Management', 'Administrator', '2022-01-10', 'Initial assignment', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Operations', 'Operations Manager', '2022-05-16', 'Initial assignment', (select id from public.profiles where email = 'admin@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Finance', 'Payroll Specialist', '2023-09-04', 'Initial assignment', (select id from public.profiles where email = 'admin@test.com'));

-- Vacation requests
insert into public.vacation_requests (
  employee_id, start_date, end_date, days_requested, request_status, reason, approved_by, approved_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-04-15', '2026-04-19', 3.0, 'pending',
    'Family trip', null, null
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-10', '2026-03-12', 2.0, 'approved',
    'Personal days', (select id from public.profiles where email = 'admin@test.com'), now() - interval '15 days'
  );

select setval(
  'public.employee_code_seq',
  (select coalesce(max(employee_code::bigint), 0) from public.employees)
);

-- Attendance records
insert into public.attendance_records (employee_id, event_type, occurred_at, source, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'clock_in', now() - interval '2 hours', 'web', (select id from public.profiles where email = 'employee@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'clock_out', now() - interval '1 hour', 'web', (select id from public.profiles where email = 'employee@test.com')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'clock_in', now() - interval '3 hours', 'web', (select id from public.profiles where email = 'manager@test.com'));

-- Loans
insert into public.employee_loans (
  id, employee_id, description, principal_amount, currency, installments_total, installments_paid,
  installment_amount, start_date, payroll_deduction_enabled, payroll_deduction_code,
  outstanding_balance, status, created_by
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Emergency medical support', 2400, 'USD', 12, 3, 200, '2026-01-05', true, 'LM-LOAN-MED',
    1800, 'active', (select id from public.profiles where email = 'admin@test.com')
  )
on conflict (id) do nothing;

insert into public.loan_repayments (loan_id, employee_id, amount, paid_on, source, payroll_period, note, created_by)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 200, '2026-01-31', 'payroll', '2026-01', 'Payroll deduction', (select id from public.profiles where email = 'admin@test.com')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 200, '2026-02-28', 'payroll', '2026-02', 'Payroll deduction', (select id from public.profiles where email = 'admin@test.com')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 200, '2026-03-31', 'payroll', '2026-03', 'Payroll deduction', (select id from public.profiles where email = 'admin@test.com'));

-- Documents
insert into public.documents (
  id, employee_id, title, category, file_path, requires_ack, is_global, uploaded_by
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1', null, 'Employee Handbook 2026', 'policy',
    'global/employee-handbook-2026.pdf', true, true, (select id from public.profiles where email = 'admin@test.com')
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Employment Contract',
    'contract', 'employees/LM-0003/contract.pdf', true, false, (select id from public.profiles where email = 'admin@test.com')
  )
on conflict (id) do nothing;

insert into public.document_acknowledgements (document_id, employee_id, acknowledged_at)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', now() - interval '2 days')
on conflict (document_id, employee_id) do nothing;

-- Onboarding and offboarding tasks
insert into public.onboarding_tasks (employee_id, task_name, owner_profile_id, due_date, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Create payroll profile', (select id from public.profiles where email = 'admin@test.com'), current_date + 2, 'pending'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Assign laptop and accounts', (select id from public.profiles where email = 'manager@test.com'), current_date + 1, 'pending');

insert into public.offboarding_tasks (employee_id, task_name, owner_profile_id, due_date, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Knowledge transfer checklist', (select id from public.profiles where email = 'admin@test.com'), current_date + 10, 'pending');

-- Notifications
insert into public.internal_notifications (recipient_profile_id, title, body, module, link)
values
  ((select id from public.profiles where email = 'admin@test.com'), 'Vacation request pending', 'Main Employee submitted a new vacation request.', 'vacations', '/vacations'),
  ((select id from public.profiles where email = 'manager@test.com'), 'Loan payment processed', 'Loan repayment for Main Employee was recorded.', 'loans', '/loans');

-- Audit logs
insert into public.audit_logs (actor_id, actor_email, module, action, entity_name, entity_id, new_data)
values
  (
    (select id from public.profiles where email = 'admin@test.com'), 'admin@test.com', 'employees', 'seed_insert', 'employees',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '{"note":"Initial seed employee"}'::jsonb
  ),
  (
    (select id from public.profiles where email = 'admin@test.com'), 'admin@test.com', 'loans', 'seed_insert', 'employee_loans',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '{"note":"Initial seed loan"}'::jsonb
  );
