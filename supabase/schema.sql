create table if not exists accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  name text not null, institution text, type text not null, balance numeric(12,2) default 0,
  created_at timestamptz default now()
);
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  account_id uuid references accounts on delete set null, title text not null, category text not null,
  kind text check (kind in ('income','expense')) not null, amount numeric(12,2) not null,
  occurred_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  name text not null, target_amount numeric(12,2) not null, saved_amount numeric(12,2) default 0,
  target_date date, created_at timestamptz default now()
);
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table savings_goals enable row level security;
create policy "own accounts" on accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on savings_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
