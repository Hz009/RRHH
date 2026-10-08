-- Datos de contacto y pago que completa el empleado.
-- El administrador puede dejarlos vacíos.

alter table public.employees
  add column if not exists phone_prefix text,
  add column if not exists whatsapp_prefix text,
  add column if not exists whatsapp_number text,
  add column if not exists bank_account_type text;

alter table public.employees
  drop constraint if exists employees_bank_account_type_chk;

alter table public.employees
  add constraint employees_bank_account_type_chk
  check (bank_account_type is null or bank_account_type in ('savings', 'checking'));

alter table public.employees alter column payment_method drop default;
alter table public.employees alter column payment_method drop not null;

alter table public.employee_compensation_history alter column payment_method drop not null;
