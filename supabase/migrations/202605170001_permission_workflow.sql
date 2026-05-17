create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,
  full_name text not null,
  email text,
  department text not null,
  job_title text not null,
  manager_id uuid references public.app_users(id),
  role_type text not null check (role_type in ('employee', 'manager', 'system_owner', 'data_owner', 'internal_control', 'it_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permission_systems (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  business_domain text not null,
  owner_id uuid references public.app_users(id),
  data_owner_id uuid references public.app_users(id),
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.permission_assets (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.permission_systems(id) on delete cascade,
  asset_type text not null check (asset_type in ('application_role', 'bi_report', 'mailbox', 'drive_folder', 'temporary_access')),
  name text not null,
  default_permission text not null,
  data_scope_template text not null,
  risk_level text not null check (risk_level in ('L1', 'L2', 'L3', 'L4')),
  allows_export boolean not null default false,
  requires_expiry boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  request_category text not null,
  risk_level text not null check (risk_level in ('L1', 'L2', 'L3', 'L4', 'L5')),
  step_order integer not null,
  approver_role text not null check (approver_role in ('manager', 'department_head', 'system_owner', 'data_owner', 'report_owner', 'internal_control', 'it_admin', 'requester_confirm')),
  sla_hours integer not null default 48,
  is_active boolean not null default true,
  unique (request_category, risk_level, step_order)
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  requester_id uuid not null references public.app_users(id),
  category text not null,
  request_type text not null check (request_type in ('new', 'change', 'extend', 'revoke', 'emergency')),
  system_id uuid references public.permission_systems(id),
  asset_id uuid references public.permission_assets(id),
  permission_name text not null,
  data_scope text not null,
  business_reason text not null,
  expected_completion text not null default 'normal',
  risk_level text not null check (risk_level in ('L1', 'L2', 'L3', 'L4', 'L5')),
  need_export boolean not null default false,
  expires_at date,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_approval', 'rejected', 'approved', 'executing', 'completed', 'revoked')),
  current_step integer not null default 0,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.access_requests(id) on delete cascade,
  step_order integer not null,
  approver_role text not null,
  approver_id uuid references public.app_users(id),
  status text not null default 'pending' check (status in ('pending', 'active', 'approved', 'rejected', 'skipped')),
  decision_comment text,
  due_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, step_order)
);

create table if not exists public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.access_requests(id),
  user_id uuid not null references public.app_users(id),
  system_id uuid references public.permission_systems(id),
  asset_id uuid references public.permission_assets(id),
  permission_name text not null,
  data_scope text not null,
  risk_level text not null,
  granted_by uuid references public.app_users(id),
  granted_at timestamptz not null default now(),
  expires_at date,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  revoke_reason text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.access_requests(id) on delete set null,
  actor_id uuid references public.app_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists access_requests_touch_updated_at on public.access_requests;
create trigger access_requests_touch_updated_at
before update on public.access_requests
for each row execute function public.touch_updated_at();

alter table public.app_users enable row level security;
alter table public.permission_systems enable row level security;
alter table public.permission_assets enable row level security;
alter table public.approval_rules enable row level security;
alter table public.access_requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.permission_grants enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "demo read app users" on public.app_users;
drop policy if exists "demo read systems" on public.permission_systems;
drop policy if exists "demo read assets" on public.permission_assets;
drop policy if exists "demo read rules" on public.approval_rules;
drop policy if exists "demo crud requests" on public.access_requests;
drop policy if exists "demo crud approval steps" on public.approval_steps;
drop policy if exists "demo crud grants" on public.permission_grants;
drop policy if exists "demo crud audit logs" on public.audit_logs;

create policy "demo read app users" on public.app_users for select to anon, authenticated using (true);
create policy "demo read systems" on public.permission_systems for select to anon, authenticated using (true);
create policy "demo read assets" on public.permission_assets for select to anon, authenticated using (true);
create policy "demo read rules" on public.approval_rules for select to anon, authenticated using (true);

create policy "demo crud requests" on public.access_requests for all to anon, authenticated using (true) with check (true);
create policy "demo crud approval steps" on public.approval_steps for all to anon, authenticated using (true) with check (true);
create policy "demo crud grants" on public.permission_grants for all to anon, authenticated using (true) with check (true);
create policy "demo crud audit logs" on public.audit_logs for all to anon, authenticated using (true) with check (true);

insert into public.app_users (employee_no, full_name, email, department, job_title, role_type)
values
  ('E10001', '张三', 'zhangsan@example.com', '销售一部', '区域经理', 'employee'),
  ('E10002', '王五', 'wangwu@example.com', '销售一部', '销售负责人', 'manager'),
  ('E20001', '李四', 'lisi@example.com', 'IT部', 'BI负责人', 'system_owner'),
  ('E30001', '赵六', 'zhaoliu@example.com', '财务部', '财务数据Owner', 'data_owner'),
  ('E40001', '钱七', 'qianqi@example.com', '内控部', '内控经理', 'internal_control'),
  ('E50001', '周八', 'zhouba@example.com', 'IT部', '权限管理员', 'it_admin')
on conflict (employee_no) do update
set full_name = excluded.full_name,
    email = excluded.email,
    department = excluded.department,
    job_title = excluded.job_title,
    role_type = excluded.role_type;

update public.app_users requester
set manager_id = manager.id
from public.app_users manager
where requester.employee_no = 'E10001'
  and manager.employee_no = 'E10002';

insert into public.permission_systems (code, name, business_domain, owner_id, data_owner_id, is_sensitive)
select 'BI', 'BI平台', '经营分析', so.id, doo.id, true
from public.app_users so, public.app_users doo
where so.employee_no = 'E20001' and doo.employee_no = 'E30001'
on conflict (code) do update
set name = excluded.name,
    business_domain = excluded.business_domain,
    owner_id = excluded.owner_id,
    data_owner_id = excluded.data_owner_id,
    is_sensitive = excluded.is_sensitive;

insert into public.permission_systems (code, name, business_domain, owner_id, data_owner_id, is_sensitive)
select 'WMS', 'WMS', '供应链仓储', so.id, doo.id, true
from public.app_users so, public.app_users doo
where so.employee_no = 'E50001' and doo.employee_no = 'E30001'
on conflict (code) do update
set name = excluded.name,
    business_domain = excluded.business_domain,
    owner_id = excluded.owner_id,
    data_owner_id = excluded.data_owner_id,
    is_sensitive = excluded.is_sensitive;

insert into public.permission_systems (code, name, business_domain, owner_id, data_owner_id, is_sensitive)
select 'DMS', 'DMS', '销售/经销商', so.id, doo.id, true
from public.app_users so, public.app_users doo
where so.employee_no = 'E50001' and doo.employee_no = 'E30001'
on conflict (code) do update
set name = excluded.name,
    business_domain = excluded.business_domain,
    owner_id = excluded.owner_id,
    data_owner_id = excluded.data_owner_id,
    is_sensitive = excluded.is_sensitive;

insert into public.permission_assets (system_id, asset_type, name, default_permission, data_scope_template, risk_level, allows_export, requires_expiry)
select s.id, 'bi_report', '价格毛利明细', '查看 + 明细导出', '区域/渠道/品牌/客户', 'L4', true, true
from public.permission_systems s where s.code = 'BI'
on conflict do nothing;

insert into public.permission_assets (system_id, asset_type, name, default_permission, data_scope_template, risk_level, allows_export, requires_expiry)
select s.id, 'temporary_access', '库存调整', '调整/审批', '仓库', 'L3', true, true
from public.permission_systems s where s.code = 'WMS'
on conflict do nothing;

insert into public.permission_assets (system_id, asset_type, name, default_permission, data_scope_template, risk_level, allows_export, requires_expiry)
select s.id, 'application_role', '价格维护', '维护', '区域/客户组', 'L3', false, false
from public.permission_systems s where s.code = 'DMS'
on conflict do nothing;

insert into public.approval_rules (request_category, risk_level, step_order, approver_role, sla_hours)
values
  ('BI报表权限', 'L4', 1, 'manager', 24),
  ('BI报表权限', 'L4', 2, 'report_owner', 24),
  ('BI报表权限', 'L4', 3, 'data_owner', 24),
  ('BI报表权限', 'L4', 4, 'internal_control', 24),
  ('BI报表权限', 'L4', 5, 'it_admin', 24),
  ('临时权限', 'L3', 1, 'manager', 24),
  ('临时权限', 'L3', 2, 'system_owner', 24),
  ('临时权限', 'L3', 3, 'it_admin', 24),
  ('应用系统权限', 'L3', 1, 'manager', 48),
  ('应用系统权限', 'L3', 2, 'system_owner', 48),
  ('应用系统权限', 'L3', 3, 'it_admin', 48)
on conflict (request_category, risk_level, step_order) do update
set approver_role = excluded.approver_role,
    sla_hours = excluded.sla_hours,
    is_active = true;
