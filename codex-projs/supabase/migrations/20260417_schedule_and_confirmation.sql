alter table if exists appointments
add column if not exists confirmation smallint not null default 0;

create table if not exists day_schedules (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references specialists(id) on delete cascade,
  schedule_date date not null,
  start_time time not null default '09:00',
  end_time time not null default '21:00',
  is_working_day boolean not null default true,
  created_at timestamptz not null default now(),
  unique (specialist_id, schedule_date)
);

create table if not exists schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  day_schedule_id uuid not null references day_schedules(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

alter table day_schedules enable row level security;
alter table schedule_breaks enable row level security;

create policy "Public can read day schedules"
on day_schedules for select
to public
using (true);

create policy "Admins manage day schedules"
on day_schedules for all
to authenticated
using (true)
with check (true);

create policy "Public can read schedule breaks"
on schedule_breaks for select
to public
using (true);

create policy "Admins manage schedule breaks"
on schedule_breaks for all
to authenticated
using (true)
with check (true);
