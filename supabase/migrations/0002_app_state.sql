-- Per-user key/value JSON store — cloud sync for the single dev user.
-- Each UI slice (tasks, habits, meals, weights, fitness stats) is one row.
create table if not exists app_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table app_state enable row level security;
create policy "app_state_own" on app_state for all using (user_id = auth.uid());
