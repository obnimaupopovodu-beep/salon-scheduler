alter table specialists
  add column if not exists branch_id uuid references branches(id);

create index if not exists specialists_branch_id_idx on specialists(branch_id);

with branch_usage as (
  select specialist_id, branch_id, count(*) as usage_count
  from (
    select specialist_id, branch_id
    from day_schedules
    where branch_id is not null

    union all

    select specialist_id, branch_id
    from appointments
    where branch_id is not null
  ) usage
  group by specialist_id, branch_id
),
ranked_usage as (
  select
    specialist_id,
    branch_id,
    row_number() over (
      partition by specialist_id
      order by usage_count desc, branch_id
    ) as row_num
  from branch_usage
)
update specialists
set branch_id = ranked_usage.branch_id
from ranked_usage
where specialists.id = ranked_usage.specialist_id
  and ranked_usage.row_num = 1
  and specialists.branch_id is null;

update day_schedules
set branch_id = specialists.branch_id
from specialists
where day_schedules.specialist_id = specialists.id
  and day_schedules.branch_id is null
  and specialists.branch_id is not null;

update appointments
set branch_id = specialists.branch_id
from specialists
where appointments.specialist_id = specialists.id
  and appointments.branch_id is null
  and specialists.branch_id is not null;
