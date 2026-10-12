drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.deletion_queue, public.files, public.folders, public.user_storage, public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.reserve_upload(uuid,uuid,text,text,text,bigint,text,int,bigint);
drop function if exists public.finalize_upload(uuid,uuid,bigint);
drop function if exists public.release_upload(uuid,uuid);
drop function if exists public.delete_file(uuid,uuid);
drop function if exists public.expire_reservations();
drop function if exists public.folders_no_cycle() cascade;
