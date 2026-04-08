create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Authenticated can read clients"
on public.clients
for select
to authenticated
using (true);

create policy "Authenticated can insert clients"
on public.clients
for insert
to authenticated
with check (true);

create policy "Authenticated can update clients"
on public.clients
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated can delete clients"
on public.clients
for delete
to authenticated
using (true);

