-- Create branches table
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

-- Insert the two branches
insert into branches (slug, name, address) values
  ('garib', 'Гарибальди', 'Гарибальди 36'),
  ('shmit', 'Шмитовский', 'Шмитовский проезд 3');

-- Link day_schedules to a branch
alter table day_schedules
  add column if not exists branch_id uuid references branches(id) on delete cascade;

-- Update unique constraint to (specialist_id, schedule_date, branch_id)
alter table day_schedules drop constraint if exists day_schedules_specialist_id_schedule_date_key;
alter table day_schedules add constraint day_schedules_specialist_branch_date_key
  unique (specialist_id, schedule_date, branch_id);

-- Link appointments to a branch
alter table appointments
  add column if not exists branch_id uuid references branches(id);

-- RLS for branches (public read)
alter table branches enable row level security;
create policy "Public can read branches" on branches for select to public using (true);
create policy "Admins manage branches" on branches for all to authenticated using (true) with check (true);
