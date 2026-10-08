-- Managers can see their whole reporting line, not only direct reports.
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
