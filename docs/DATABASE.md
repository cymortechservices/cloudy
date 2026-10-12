# Database
Tables: `profiles`, `user_storage` (quota, used, reserved), `folders`, `files` (status `pending|ready`), `deletion_queue`. Migration: `supabase/migrations/0001_init.sql`; rollback: `0001_init.down.sql`.

**Accounting:** `used_bytes` counts only `ready` files; `reserved_bytes` counts pending reservations. Available = quota − used − reserved. Each function locks the user's `user_storage` row, so concurrent uploads serialise and cannot exceed quota. `finalize_upload` only transitions `pending → ready` (duplicate calls are no-ops). `release_upload` and `expire_reservations` return reserved bytes and queue the object for deletion. `delete_file` adjusts usage and queues object deletion in the same transaction; object deletion is retried from `deletion_queue`.

**Global cap:** `reserve_upload` compares `sum(used+reserved)` over all users with `GLOBAL_STORAGE_CAP_BYTES`. This is an app-level cap, not provider-reported usage; compare it with your R2 dashboard periodically.

**RLS:** users may SELECT their own rows (files only when `ready`) and UPDATE only `profiles.display_name`. No client write grants exist on other tables. Privileged functions are revoked from `anon`/`authenticated`. Policies compare `owner_id` to `auth.uid()` directly, avoiding recursive policies.

**Reconciliation (manual for now):** list R2 objects and compare with `files.object_key`; delete unknown objects older than a day. A script for this is not included.
