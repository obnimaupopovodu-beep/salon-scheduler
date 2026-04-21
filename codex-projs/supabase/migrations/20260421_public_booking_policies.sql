alter table public.specialists enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'specialists'
      and policyname = 'Public can read specialists'
  ) then
    create policy "Public can read specialists"
      on public.specialists
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'service_categories'
      and policyname = 'Public can read service categories'
  ) then
    create policy "Public can read service categories"
      on public.service_categories
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'services'
      and policyname = 'Public can read services'
  ) then
    create policy "Public can read services"
      on public.services
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Public can create appointments'
  ) then
    create policy "Public can create appointments"
      on public.appointments
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Admins read appointments'
  ) then
    create policy "Admins read appointments"
      on public.appointments
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Admins update appointments'
  ) then
    create policy "Admins update appointments"
      on public.appointments
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Admins delete appointments'
  ) then
    create policy "Admins delete appointments"
      on public.appointments
      for delete
      to authenticated
      using (true);
  end if;
end $$;
