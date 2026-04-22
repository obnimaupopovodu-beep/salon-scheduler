-- Prevent double-booking: no two appointments for the same specialist can overlap.
-- The UNIQUE constraint on (specialist_id, start_time) blocks exact-time collisions at DB level.
-- The exclusion constraint (requires btree_gist) blocks any time-range overlaps.

-- 1. Simple unique index on start_time per specialist (works without extensions)
alter table appointments
  add constraint appointments_specialist_start_unique
  unique (specialist_id, start_time);

-- 2. Enable btree_gist for range-based exclusion (safe to run, extension is available in Supabase)
create extension if not exists btree_gist;

-- 3. Exclusion constraint: no overlapping time ranges per specialist
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    specialist_id with =,
    tstzrange(start_time::timestamptz, end_time::timestamptz, '[)') with &&
  );

-- 4. Performance indexes for common query patterns
create index if not exists idx_appointments_specialist_date
  on appointments (specialist_id, (start_time::date));

create index if not exists idx_appointments_branch_date
  on appointments (branch_id, (start_time::date));
