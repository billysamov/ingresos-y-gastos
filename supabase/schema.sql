-- Ejecuta este script una sola vez en Supabase: SQL Editor > New query > Run.
-- No agrega datos simulados. La política es solo para pruebas personales sin login.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  currency_code char(3) not null default 'PEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  institution text,
  account_type text not null check (account_type in ('cash','bank','wallet','credit_card','savings')),
  current_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category_type text not null check (category_type in ('income','expense','saving')),
  color text,
  icon text,
  created_at timestamptz not null default now(),
  unique (profile_id, name, category_type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  transaction_type text not null check (transaction_type in ('income','expense','transfer')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  due_day smallint check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fixed_expenses add column if not exists notes text;

create table if not exists public.monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_month date not null default date_trunc('month', now())::date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_groups (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_group_id uuid not null references public.expense_groups(id) on delete cascade,
  name text not null,
  category text,
  amount numeric(12,2) not null check (amount > 0),
  purchased_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Estado temporal de la interfaz mientras se completan los formularios por tabla.
create table if not exists public.finanza_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists transactions_profile_date_idx on public.transactions(profile_id, occurred_at desc);
create index if not exists fixed_expenses_profile_idx on public.fixed_expenses(profile_id);
create index if not exists monthly_expenses_profile_month_idx on public.monthly_expenses(profile_id, expense_month desc);
create index if not exists expense_groups_profile_idx on public.expense_groups(profile_id);
create index if not exists expense_items_group_idx on public.expense_items(expense_group_id);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.monthly_expenses enable row level security;
alter table public.expense_groups enable row level security;
alter table public.expense_items enable row level security;
alter table public.savings_goals enable row level security;
alter table public.finanza_state enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','accounts','categories','transactions','fixed_expenses','monthly_expenses','expense_groups','expense_items','savings_goals','finanza_state']
  loop
    execute format('drop policy if exists "finanza_test_access" on public.%I', table_name);
    execute format('create policy "finanza_test_access" on public.%I for all to anon using (true) with check (true)', table_name);
  end loop;
end $$;

-- Actualiza la caché de la API REST después de crear las tablas.
notify pgrst, 'reload schema';
