-- Cloudy schema. Apply in the Supabase SQL editor or `supabase db push`.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_storage (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  quota_bytes bigint not null check (quota_bytes >= 0),
  used_bytes bigint not null default 0 check (used_bytes >= 0),
  reserved_bytes bigint not null default 0 check (reserved_bytes >= 0),
  updated_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120 and name !~ '[/\\]'),
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index folders_unique_name on public.folders (owner_id, coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index folders_owner_parent on public.folders (owner_id, parent_id);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  original_name text not null check (char_length(original_name) between 1 and 255),
  object_key text not null unique,
  mime_type text not null,
  file_extension text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text,
  status text not null default 'pending' check (status in ('pending','ready')),
  reservation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (object_key like owner_id::text || '/%')
);
create index files_owner_created on public.files (owner_id, created_at desc) where status='ready';
create index files_owner_folder on public.files (owner_id, folder_id) where status='ready';
create index files_owner_name on public.files (owner_id, lower(original_name) text_pattern_ops);
create index files_pending_expiry on public.files (reservation_expires_at) where status='pending';

-- Retryable object-deletion queue, drained by the backend cleanup job
create table public.deletion_queue (
  id bigserial primary key,
  object_key text not null unique,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_storage enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.deletion_queue enable row level security;

create policy profiles_select on public.profiles for select using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy storage_select on public.user_storage for select using (owner_id = (select auth.uid()));
create policy folders_select on public.folders for select using (owner_id = (select auth.uid()));
create policy files_select on public.files for select using (owner_id = (select auth.uid()) and status='ready');
-- No write policies on user_storage, folders, files, deletion_queue: browser clients cannot write them.

revoke all on public.user_storage, public.folders, public.files, public.deletion_queue from anon, authenticated;
grant select on public.user_storage, public.folders, public.files to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.user_storage (owner_id, quota_bytes) values (new.id, 1073741824);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Atomic reservation: the row lock on user_storage serialises concurrent uploads per user.
create or replace function public.reserve_upload(
  p_owner uuid, p_folder uuid, p_name text, p_mime text, p_ext text, p_size bigint,
  p_key text, p_ttl_seconds int, p_global_cap bigint
) returns uuid language plpgsql security definer set search_path = public as $$
declare s public.user_storage; g bigint; fid uuid;
begin
  select * into s from public.user_storage where owner_id = p_owner for update;
  if not found then raise exception 'NO_STORAGE_ROW'; end if;
  if s.used_bytes + s.reserved_bytes + p_size > s.quota_bytes then raise exception 'USER_QUOTA_EXCEEDED'; end if;
  select coalesce(sum(used_bytes + reserved_bytes),0) into g from public.user_storage;
  if g + p_size > p_global_cap then raise exception 'GLOBAL_CAP_EXCEEDED'; end if;
  if p_folder is not null and not exists (select 1 from public.folders where id=p_folder and owner_id=p_owner) then
    raise exception 'FOLDER_NOT_FOUND'; end if;
  insert into public.files (owner_id, folder_id, original_name, object_key, mime_type, file_extension, size_bytes, status, reservation_expires_at)
    values (p_owner, p_folder, p_name, p_key, p_mime, p_ext, p_size, 'pending', now() + make_interval(secs => p_ttl_seconds))
    returning id into fid;
  update public.user_storage set reserved_bytes = reserved_bytes + p_size, updated_at = now() where owner_id = p_owner;
  return fid;
end $$;

-- Idempotent: only a 'pending' row transitions, so duplicate calls never double-count.
create or replace function public.finalize_upload(p_owner uuid, p_file uuid, p_actual_size bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare f public.files;
begin
  select * into f from public.files where id=p_file and owner_id=p_owner for update;
  if not found then raise exception 'FILE_NOT_FOUND'; end if;
  if f.status = 'ready' then return false; end if;
  if p_actual_size > f.size_bytes then raise exception 'SIZE_MISMATCH'; end if;
  perform 1 from public.user_storage where owner_id=p_owner for update;
  update public.user_storage set reserved_bytes = greatest(reserved_bytes - f.size_bytes,0),
    used_bytes = used_bytes + p_actual_size, updated_at = now() where owner_id = p_owner;
  update public.files set status='ready', size_bytes=p_actual_size, reservation_expires_at=null, updated_at=now() where id=p_file;
  return true;
end $$;

create or replace function public.release_upload(p_owner uuid, p_file uuid)
returns text language plpgsql security definer set search_path = public as $$
declare f public.files;
begin
  select * into f from public.files where id=p_file and owner_id=p_owner and status='pending' for update;
  if not found then return null; end if;
  perform 1 from public.user_storage where owner_id=p_owner for update;
  update public.user_storage set reserved_bytes = greatest(reserved_bytes - f.size_bytes,0), updated_at=now() where owner_id=p_owner;
  delete from public.files where id=p_file;
  insert into public.deletion_queue(object_key) values (f.object_key) on conflict do nothing;
  return f.object_key;
end $$;

create or replace function public.delete_file(p_owner uuid, p_file uuid)
returns text language plpgsql security definer set search_path = public as $$
declare f public.files;
begin
  select * into f from public.files where id=p_file and owner_id=p_owner and status='ready' for update;
  if not found then return null; end if;
  perform 1 from public.user_storage where owner_id=p_owner for update;
  update public.user_storage set used_bytes = greatest(used_bytes - f.size_bytes,0), updated_at=now() where owner_id=p_owner;
  delete from public.files where id=p_file;
  insert into public.deletion_queue(object_key) values (f.object_key) on conflict do nothing;
  return f.object_key;
end $$;

create or replace function public.expire_reservations()
returns setof text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id, owner_id from public.files where status='pending' and reservation_expires_at < now() loop
    return next public.release_upload(r.owner_id, r.id);
  end loop;
end $$;

create or replace function public.folders_no_cycle() returns trigger language plpgsql as $$
declare cur uuid := new.parent_id;
begin
  while cur is not null loop
    if cur = new.id then raise exception 'FOLDER_CYCLE'; end if;
    select parent_id into cur from public.folders where id = cur;
  end loop;
  return new;
end $$;
create trigger folders_cycle before insert or update of parent_id on public.folders for each row execute function public.folders_no_cycle();

-- Privileged functions: backend (service role) only
revoke all on function public.reserve_upload(uuid,uuid,text,text,text,bigint,text,int,bigint) from public, anon, authenticated;
revoke all on function public.finalize_upload(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.release_upload(uuid,uuid) from public, anon, authenticated;
revoke all on function public.delete_file(uuid,uuid) from public, anon, authenticated;
revoke all on function public.expire_reservations() from public, anon, authenticated;
