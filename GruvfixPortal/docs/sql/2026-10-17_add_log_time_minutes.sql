-- Replaces the per-entry "Hour Slot" with a manually entered time (hours +
-- minutes) on each part row of a work entry.
-- Run this once in the Supabase SQL Editor for this project (the app only
-- holds the anon key client-side, so this schema change can't be applied
-- automatically from the app code).

-- 1. New column: time taken for the row, stored as total minutes.
alter table public.logs
  add column if not exists time_minutes integer;

-- 2. Entries saved before this change were logged against a one-hour slot,
-- so treat each of them as 60 minutes.
update public.logs
set time_minutes = 60
where time_minutes is null;

-- 3. New entries no longer have an hour slot. The old column is kept so
-- historical rows still carry their original slot.
alter table public.logs
  alter column hour drop not null;
