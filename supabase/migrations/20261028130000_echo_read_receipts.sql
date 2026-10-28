-- =============================================================================
-- FarmEcho: Echo message read receipts.
--
-- Status model (per recipient, per message):
--   sent      -> implied by the existence of echo_messages row (no receipt row)
--   delivered -> recipient's client received the message (realtime or fetch)
--   read      -> recipient viewed the message
--
-- Status only moves forward: delivered -> read. A later "delivered" never
-- downgrades a "read" receipt (enforced by trigger, not just by the client).
-- Senders never receive a receipt for their own message.
-- =============================================================================

create table public.message_receipts (
  message_id   uuid not null references public.echo_messages (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       text not null check (status in ('delivered', 'read')),
  delivered_at timestamptz not null default now(),
  read_at      timestamptz,
  primary key (message_id, user_id),
  check (status <> 'read' or read_at is not null)
);

create index message_receipts_user_idx on public.message_receipts (user_id);

alter table public.message_receipts enable row level security;

-- Members of the message's community can see who has received or read it.
-- The echo_messages policy already restricts which messages the caller can see.
create policy message_receipts_read on public.message_receipts
  for select to authenticated
  using (exists (
    select 1 from public.echo_messages m where m.id = message_receipts.message_id
  ));

-- A recipient records only their own receipts, and never for their own message.
create policy message_receipts_write_own on public.message_receipts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.echo_messages m
      where m.id = message_receipts.message_id and m.sender_id <> auth.uid()
    )
  );

create policy message_receipts_update_own on public.message_receipts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Forward-only status: "read" can never go back to "delivered".
create or replace function public.enforce_receipt_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'read' and new.status <> 'read' then
    raise exception 'Receipt status cannot move backwards from read'
      using errcode = '22023';
  end if;
  -- Keep the first delivery time; set read_at when the status becomes read.
  new.delivered_at := old.delivered_at;
  if new.status = 'read' and old.read_at is not null then
    new.read_at := old.read_at;
  end if;
  return new;
end;
$$;

create trigger message_receipts_forward_only
  before update on public.message_receipts
  for each row execute function public.enforce_receipt_progress();

-- Records a receipt in one call. Insert on first event, otherwise upgrade.
create or replace function public.set_receipt(p_message_id uuid, p_status text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_status not in ('delivered', 'read') then
    raise exception 'Invalid receipt status' using errcode = '22023';
  end if;

  insert into public.message_receipts (message_id, user_id, status, read_at)
  values (
    p_message_id,
    auth.uid(),
    p_status,
    case when p_status = 'read' then now() end
  )
  on conflict (message_id, user_id) do update
    set status  = excluded.status,
        read_at = case when excluded.status = 'read'
                       then coalesce(public.message_receipts.read_at, now())
                       else public.message_receipts.read_at end
    where public.message_receipts.status <> 'read';
end;
$$;

-- Marks every message in a community, sent by someone else, as read.
create or replace function public.mark_community_read(p_community_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  with targets as (
    select m.id
    from public.echo_messages m
    where m.community_id = p_community_id
      and m.sender_id <> auth.uid()
  )
  insert into public.message_receipts (message_id, user_id, status, read_at)
  select t.id, auth.uid(), 'read', now() from targets t
  on conflict (message_id, user_id) do update
    set status  = 'read',
        read_at = coalesce(public.message_receipts.read_at, excluded.read_at)
    where public.message_receipts.status <> 'read';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Privileges: members can call the receipt functions; the table itself is
-- read and written only through RLS-checked statements.
revoke all on function public.set_receipt(uuid, text) from public, anon;
revoke all on function public.mark_community_read(uuid) from public, anon;
grant execute on function public.set_receipt(uuid, text) to authenticated;
grant execute on function public.mark_community_read(uuid) to authenticated;

grant select, insert on public.message_receipts to authenticated;
grant update (status, read_at) on public.message_receipts to authenticated;
grant all on public.message_receipts to service_role;

-- RLS helper for the receipt policies' membership check uses echo_messages RLS,
-- and the call chain above also needs the community-membership helper:
grant execute on function public.is_community_member(uuid) to authenticated;

-- Live receipt updates for the sender's UI (RLS filters change events).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.message_receipts;
  end if;
end;
$$;
