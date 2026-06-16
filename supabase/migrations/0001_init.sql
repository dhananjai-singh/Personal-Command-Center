-- Personal Command Center — initial schema
-- Run via: supabase db push  (or supabase migration up)

-- ─── tasks ───────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  type             text not null check (type in ('task', 'deadline', 'event')),
  category         text not null check (category in ('Studies', 'Work', 'Personal'))
                   default 'Personal',
  due_datetime     timestamptz,
  status           text not null check (status in ('open', 'done')) default 'open',
  project_id       uuid,  -- FK added after projects table exists (see alter below)
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  last_activity_at timestamptz not null default now()
);

-- ─── habits ──────────────────────────────────────────────────────────────────
create table if not exists habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  category          text not null check (category in ('Studies', 'Work', 'Personal'))
                    default 'Personal',
  time_hint         text,
  recurrence        text not null check (recurrence in ('daily', 'weekly')) default 'daily',
  recurrence_detail text,
  created_at        timestamptz not null default now()
);

create table if not exists habit_completions (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references habits(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  completed  boolean not null default true,
  unique (habit_id, date)
);

-- ─── projects ────────────────────────────────────────────────────────────────
create table if not exists projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  kind             text not null check (kind in ('one_time', 'recurring')) default 'one_time',
  status           text not null check (status in ('open', 'done')) default 'open',
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- Now that projects exists, wire tasks.project_id -> projects.id.
alter table tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;

-- ─── notes ───────────────────────────────────────────────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  body       text not null default '',
  tag        text check (tag in ('Studies', 'Work', 'Personal')),
  pinned     boolean not null default false,
  task_id    uuid references tasks(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on notes
  for each row execute procedure update_updated_at();

-- ─── meals ───────────────────────────────────────────────────────────────────
create table if not exists meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  logged_at timestamptz not null default now(),
  cal       integer not null default 0,
  protein   numeric(6,1) not null default 0,
  carbs     numeric(6,1) not null default 0,
  fat       numeric(6,1) not null default 0
);

-- ─── fitness_days ────────────────────────────────────────────────────────────
-- Garmin sync snapshot per calendar day
create table if not exists fitness_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  steps       integer not null default 0,
  step_goal   integer not null default 10000,
  distance_km numeric(6,2) not null default 0,
  active_cal  integer not null default 0,
  resting_hr  integer,
  cal_goal    integer not null default 2200,
  synced_at   timestamptz not null default now(),
  unique (user_id, date)
);

-- ─── reminders ───────────────────────────────────────────────────────────────
create table if not exists reminders (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null,
  item_type text not null check (item_type in ('task', 'habit', 'note')),
  remind_at timestamptz not null,
  channel   text not null check (channel in ('email', 'calendar', 'in_app')),
  sent      boolean not null default false
);

-- ─── Row-level security ──────────────────────────────────────────────────────
alter table tasks             enable row level security;
alter table habits            enable row level security;
alter table habit_completions enable row level security;
alter table projects          enable row level security;
alter table notes             enable row level security;
alter table meals             enable row level security;
alter table fitness_days      enable row level security;
alter table reminders         enable row level security;

-- Each table: user owns their own rows
create policy "tasks_own"      on tasks             for all using (user_id = auth.uid());
create policy "habits_own"     on habits            for all using (user_id = auth.uid());
create policy "hc_own"         on habit_completions for all using (user_id = auth.uid());
create policy "projects_own"   on projects          for all using (user_id = auth.uid());
create policy "notes_own"      on notes             for all using (user_id = auth.uid());
create policy "meals_own"      on meals             for all using (user_id = auth.uid());
create policy "fitness_own"    on fitness_days      for all using (user_id = auth.uid());
