-- Adds Material, Thickness, and Drawing Upload support to the parts master.
-- Run this once in the Supabase SQL Editor for this project (the app only
-- holds the anon key client-side, so this schema change can't be applied
-- automatically from the app code).

-- 1. New columns on public.parts
alter table public.parts
  add column if not exists material text,
  add column if not exists thickness text,
  add column if not exists drawing_path text,
  add column if not exists drawing_file_name text;

-- 2. Storage bucket for uploaded drawings (PDF / DXF)
insert into storage.buckets (id, name, public)
values ('part-drawings', 'part-drawings', true)
on conflict (id) do nothing;

-- 3. Storage policies. The app authenticates with the anon key only (no
-- Supabase Auth session), so these mirror the permissive access already
-- granted to the anon key on the `parts` table itself.
create policy if not exists "Public read access to part drawings"
on storage.objects for select
using ( bucket_id = 'part-drawings' );

create policy if not exists "Public upload access to part drawings"
on storage.objects for insert
with check ( bucket_id = 'part-drawings' );

create policy if not exists "Public update access to part drawings"
on storage.objects for update
using ( bucket_id = 'part-drawings' );
