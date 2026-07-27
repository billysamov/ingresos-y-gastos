-- Finanzas: pasar de un estado JSON global a registros relacionales.
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists public.finance_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  active_year integer not null default 2026,
  active_month integer not null default 8 check (active_month between 1 and 12),
  monthly_salary numeric(12,2) not null default 0,
  auto_register_salary boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists period_key text,
  add column if not exists category_name text,
  add column if not exists account_name text,
  add column if not exists is_planned boolean not null default false,
  add column if not exists requires_confirmation boolean not null default false,
  add column if not exists completed boolean not null default true;

alter table public.fixed_expenses
  add column if not exists category_name text,
  add column if not exists account_name text,
  add column if not exists requires_confirmation boolean not null default true,
  add column if not exists completed boolean not null default false;

alter table public.monthly_expenses
  add column if not exists period_key text,
  add column if not exists category_name text,
  add column if not exists account_name text,
  add column if not exists requires_confirmation boolean not null default true,
  add column if not exists completed boolean not null default false;

alter table public.expense_groups
  add column if not exists period_key text;

alter table public.expense_items
  add column if not exists account_name text,
  add column if not exists period_key text,
  add column if not exists requires_confirmation boolean not null default true,
  add column if not exists completed boolean not null default false;

-- Solo hay un perfil actual. Crea su configuración inicial sin borrar datos.
insert into public.finance_settings (profile_id, active_year, active_month)
values ('00000000-0000-4000-8000-000000000001', 2026, 8)
on conflict (profile_id) do nothing;

-- Índices de consulta usados por la aplicación.
create index if not exists transactions_profile_period_idx on public.transactions(profile_id, period_key);
create index if not exists monthly_expenses_profile_period_idx on public.monthly_expenses(profile_id, period_key);
create index if not exists expense_items_group_period_idx on public.expense_items(expense_group_id, period_key);

-- El campo finanza_state deja de ser la fuente de datos. Se conserva temporalmente
-- solo para una posible auditoría/manual de migración; no debe leerse ni escribirse
-- desde la aplicación después de desplegar el cliente relacional.
