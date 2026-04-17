# Appointment Scheduling System

Мобильное веб-приложение для записи клиентов на услуги. Проект собран на `Next.js 14`, `TypeScript`, `Tailwind CSS` и `Supabase`.

## Запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте файл `.env.local` и добавьте переменные:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Запустите проект:

```bash
npm run dev
```

## Настройка Supabase и миграции

Если используете Supabase CLI:

```bash
supabase init
supabase migration new appointment_system
```

Добавьте в миграцию следующий SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references service_categories(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  duration_minutes integer not null,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid references specialists(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

alter table specialists enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;

create policy "Public can read specialists"
on specialists for select
to public
using (true);

create policy "Public can read categories"
on service_categories for select
to public
using (true);

create policy "Public can read services"
on services for select
to public
using (true);

create policy "Admins manage specialists"
on specialists for all
to authenticated
using (true)
with check (true);

create policy "Admins manage categories"
on service_categories for all
to authenticated
using (true)
with check (true);

create policy "Admins manage services"
on services for all
to authenticated
using (true)
with check (true);

create policy "Public can create appointments"
on appointments for insert
to public
with check (true);

create policy "Admins read appointments"
on appointments for select
to authenticated
using (true);

create policy "Admins update appointments"
on appointments for update
to authenticated
using (true)
with check (true);

create policy "Admins delete appointments"
on appointments for delete
to authenticated
using (true);
```

Затем выполните:

```bash
supabase db push
```

## Начальные данные

Для тестового наполнения можно выполнить такой seed:

```sql
insert into specialists (name)
values ('Анна');

insert into service_categories (name)
values ('Маникюр'), ('Брови');

insert into services (category_id, name, price, duration_minutes)
select id, 'Классический маникюр', 2200, 60
from service_categories
where name = 'Маникюр';

insert into services (category_id, name, price, duration_minutes)
select id, 'Покрытие гель-лаком', 2800, 90
from service_categories
where name = 'Маникюр';

insert into services (category_id, name, price, duration_minutes)
select id, 'Коррекция бровей', 1600, 30
from service_categories
where name = 'Брови';
```

## Что внутри

- Админ-логин через Supabase Auth.
- Защита `admin`-маршрутов через `middleware.ts` и серверную проверку сессии.
- Календарь расписания с realtime-обновлениями по таблице `appointments`.
- Публичный трехшаговый сценарий записи на странице `/book`.
## Schedule Update

Run `supabase/migrations/20260417_schedule_and_confirmation.sql` to add:

- `appointments.confirmation`
- `day_schedules`
- `schedule_breaks`
