-- Key-value store used by the make-server-56370ef4 Edge Function.
create table if not exists public.kv_store_56370ef4 (
  key text not null primary key,
  value jsonb not null
);

-- The Edge Function talks to this table with the service role key, which
-- bypasses RLS. Enable RLS so the anon/authenticated keys cannot read it.
alter table public.kv_store_56370ef4 enable row level security;

grant all on table public.kv_store_56370ef4 to service_role;
