-- Private storage bucket + smaller default quota for the Supabase free plan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cloudy-private', 'cloudy-private', false, 26214400, array[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- No policies are created on storage.objects: with RLS on and no policies, anon/authenticated clients cannot touch objects.
-- All access goes through the backend (service role) and short-lived signed URLs.

-- Default quota 100 MB per new user (edit to taste; must fit within your plan's total).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.user_storage (owner_id, quota_bytes) values (new.id, 104857600);
  return new;
end $$;
