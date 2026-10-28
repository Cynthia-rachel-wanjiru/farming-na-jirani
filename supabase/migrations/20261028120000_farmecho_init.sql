-- =============================================================================
-- FarmEcho: initial schema, helper functions, triggers, RLS policies and grants.
--
-- Target: Supabase PostgreSQL. Relies on the `auth` schema managed by Supabase
-- Auth (auth.users, auth.uid()). Apply with `supabase db push`.
--
-- Security model (summary):
--   * Every table has Row Level Security enabled. Default is deny.
--   * API roles (anon / authenticated) only get the grants listed at the bottom.
--   * Users can only change their own profile, and never their own role.
--   * Community content (echo messages, proposals, votes) is visible only to
--     members of that community.
--   * Each member may cast one vote per proposal, only while it is open. The
--     votes ledger is append-only (no UPDATE or DELETE grant or policy).
--   * Market prices, weather cache and published knowledge are public reads.
--   * Weather cache writes happen only through the service role (Edge Function).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Reference data: Kenyan counties (47)
--    Coordinates are approximate county headquarters, used for weather lookups.
-- -----------------------------------------------------------------------------
create table public.counties (
  code       text primary key check (code ~ '^[a-z][a-z-]{1,39}$'),
  name       text not null check (char_length(name) between 2 and 60),
  latitude   numeric(9, 6) not null check (latitude between -90 and 90),
  longitude  numeric(9, 6) not null check (longitude between -180 and 180)
);

insert into public.counties (code, name, latitude, longitude) values
  ('mombasa',         'Mombasa',           -4.0435,  39.6682),
  ('kwale',           'Kwale',             -4.1816,  39.4606),
  ('kilifi',          'Kilifi',            -3.6305,  39.8499),
  ('tana-river',      'Tana River',        -1.6500,  40.0000),
  ('lamu',            'Lamu',              -2.2717,  40.9020),
  ('taita-taveta',    'Taita Taveta',      -3.3962,  38.5561),
  ('garissa',         'Garissa',           -0.4532,  39.6461),
  ('wajir',           'Wajir',              1.7471,  40.0573),
  ('mandera',         'Mandera',            3.9366,  41.8670),
  ('marsabit',        'Marsabit',           2.3284,  37.9899),
  ('isiolo',          'Isiolo',             0.3546,  37.5822),
  ('meru',            'Meru',               0.0470,  37.6559),
  ('tharaka-nithi',   'Tharaka-Nithi',     -0.3333,  37.6500),
  ('embu',            'Embu',              -0.5389,  37.4596),
  ('kitui',           'Kitui',             -1.3667,  38.0167),
  ('machakos',        'Machakos',          -1.5177,  37.2634),
  ('makueni',         'Makueni',           -1.7833,  37.6333),
  ('nyandarua',       'Nyandarua',         -0.2667,  36.3833),
  ('nyeri',           'Nyeri',             -0.4167,  36.9500),
  ('kirinyaga',       'Kirinyaga',         -0.4985,  37.2803),
  ('muranga',         'Murang''a',         -0.7210,  37.1526),
  ('kiambu',          'Kiambu',            -1.1714,  36.8356),
  ('turkana',         'Turkana',            3.1190,  35.5970),
  ('west-pokot',      'West Pokot',         1.2389,  35.1117),
  ('samburu',         'Samburu',            1.0995,  36.6992),
  ('trans-nzoia',     'Trans Nzoia',        1.0154,  35.0062),
  ('uasin-gishu',     'Uasin Gishu',        0.5143,  35.2698),
  ('elgeyo-marakwet', 'Elgeyo-Marakwet',    0.6700,  35.5100),
  ('nandi',           'Nandi',              0.2010,  35.1000),
  ('baringo',         'Baringo',            0.4917,  35.7430),
  ('laikipia',        'Laikipia',           0.0070,  37.0720),
  ('nakuru',          'Nakuru',            -0.3031,  36.0800),
  ('narok',           'Narok',            -1.0783,  35.8600),
  ('kajiado',         'Kajiado',           -1.8526,  36.7820),
  ('kericho',         'Kericho',           -0.3689,  35.2863),
  ('bomet',           'Bomet',             -0.7813,  35.3420),
  ('kakamega',        'Kakamega',           0.2827,  34.7519),
  ('vihiga',          'Vihiga',             0.0773,  34.7226),
  ('bungoma',         'Bungoma',            0.5635,  34.5606),
  ('busia',           'Busia',              0.4608,  34.1115),
  ('siaya',           'Siaya',              0.0612,  34.2880),
  ('kisumu',          'Kisumu',            -0.0917,  34.7680),
  ('homa-bay',        'Homa Bay',          -0.5273,  34.4571),
  ('migori',          'Migori',            -1.0634,  34.4731),
  ('kisii',           'Kisii',             -0.6817,  34.7667),
  ('nyamira',         'Nyamira',           -0.5633,  34.9573),
  ('nairobi',         'Nairobi',           -1.2921,  36.8219);

-- -----------------------------------------------------------------------------
-- 3. Profiles (1:1 with Supabase Auth users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null default '' check (char_length(full_name) <= 120),
  role               text not null default 'farmer'
                       check (role in ('farmer', 'cooperative_leader', 'expert')),
  county_code        text references public.counties (code) on update cascade,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'sw')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_county_idx on public.profiles (county_code);

-- -----------------------------------------------------------------------------
-- 4. Communities and Echo messages
-- -----------------------------------------------------------------------------
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  county_code text not null references public.counties (code) on update cascade,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index communities_county_idx on public.communities (county_code);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('member', 'leader')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_members_user_idx on public.community_members (user_id);

create table public.echo_messages (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  sender_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index echo_messages_community_time_idx
  on public.echo_messages (community_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Voting: proposals, options and the votes ledger
-- -----------------------------------------------------------------------------
create table public.proposals (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  title        text not null check (char_length(title) between 5 and 200),
  description  text not null default '' check (char_length(description) <= 4000),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  opens_at     timestamptz not null default now(),
  closes_at    timestamptz not null,
  created_at   timestamptz not null default now(),
  check (closes_at > opens_at)
);

create index proposals_community_idx on public.proposals (community_id, created_at desc);

create table public.proposal_options (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 200),
  sort_order  smallint not null default 0 check (sort_order >= 0),
  unique (proposal_id, id),          -- target of the composite FK from votes
  unique (proposal_id, label)
);

create table public.votes (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  option_id   uuid not null,
  cast_at     timestamptz not null default now(),
  primary key (proposal_id, user_id),   -- one vote per member per proposal
  foreign key (proposal_id, option_id)
    references public.proposal_options (proposal_id, id) on delete cascade
);

create index votes_option_idx on public.votes (option_id);

-- -----------------------------------------------------------------------------
-- 6. Market prices and weather cache
-- -----------------------------------------------------------------------------
create table public.market_prices (
  id          bigint generated always as identity primary key,
  crop        text not null check (char_length(crop) between 2 and 80),
  market_name text not null check (char_length(market_name) between 2 and 120),
  county_code text not null references public.counties (code) on update cascade,
  unit        text not null default '90kg bag' check (char_length(unit) between 1 and 40),
  price_kes   numeric(12, 2) not null check (price_kes >= 0),
  observed_on date not null default current_date,
  source      text not null default 'community'
                check (source in ('community', 'cooperative', 'official')),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (crop, market_name, county_code, observed_on)
);

create index market_prices_county_time_idx on public.market_prices (county_code, observed_on desc);
create index market_prices_time_idx on public.market_prices (observed_on desc);

create table public.weather_cache (
  county_code text primary key references public.counties (code) on delete cascade,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 7. Knowledge base (full-text searchable)
-- -----------------------------------------------------------------------------
create table public.knowledge_articles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 200),
  body          text not null check (char_length(body) between 10 and 20000),
  language      text not null default 'en' check (language in ('en', 'sw')),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  author_id     uuid references public.profiles (id) on delete set null default auth.uid(),
  published     boolean not null default true,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index knowledge_articles_search_idx on public.knowledge_articles using gin (search_vector);

-- -----------------------------------------------------------------------------
-- 8. Triggers
-- -----------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger communities_set_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();

create trigger knowledge_articles_set_updated_at
  before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

-- Users may never change their own role. Only administrators (SQL editor,
-- postgres / service role) can promote a farmer to leader or expert.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'Roles can only be changed by an administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update of role on public.profiles
  for each row execute function public.protect_profile_role();

-- Create a profile for every new Supabase Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_county   text := nullif(new.raw_user_meta_data ->> 'county_code', '');
  v_language text := new.raw_user_meta_data ->> 'preferred_language';
begin
  insert into public.profiles (id, full_name, county_code, preferred_language)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    case when v_county in (select c.code from public.counties c) then v_county end,
    case when v_language in ('en', 'sw') then v_language else 'en' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The creator of a community becomes its first leader.
create or replace function public.add_creator_as_leader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.community_members (community_id, user_id, role)
    values (new.id, new.created_by, 'leader')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger communities_add_creator
  after insert on public.communities
  for each row execute function public.add_creator_as_leader();

-- -----------------------------------------------------------------------------
-- 9. Helper functions used by RLS policies
--    SECURITY DEFINER avoids policy recursion (e.g. community_members policies
--    checking community_members). They only return booleans.
-- -----------------------------------------------------------------------------
create or replace function public.user_has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = any (p_roles)
  );
$$;

create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_community_leader(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
  );
$$;

-- A member may vote only on an option of an open proposal in their community.
create or replace function public.can_vote(p_proposal_id uuid, p_option_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proposals p
    join public.proposal_options o
      on o.proposal_id = p.id and o.id = p_option_id
    join public.community_members m
      on m.community_id = p.community_id and m.user_id = auth.uid()
    where p.id = p_proposal_id
      and now() >= p.opens_at
      and now() < p.closes_at
  );
$$;

-- -----------------------------------------------------------------------------
-- 10. RPC: create a proposal and its options atomically (runs as the caller,
--     so RLS still applies to the insert).
-- -----------------------------------------------------------------------------
create or replace function public.create_proposal(
  p_community_id uuid,
  p_title        text,
  p_description  text,
  p_opens_at     timestamptz,
  p_closes_at    timestamptz,
  p_options      text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_proposal_id uuid;
  v_label       text;
  v_index       int := 0;
begin
  if coalesce(cardinality(p_options), 0) not between 2 and 10 then
    raise exception 'A proposal needs between 2 and 10 options'
      using errcode = '22023';
  end if;

  insert into public.proposals (community_id, title, description, created_by, opens_at, closes_at)
  values (p_community_id, p_title, coalesce(p_description, ''), auth.uid(), p_opens_at, p_closes_at)
  returning id into v_proposal_id;

  foreach v_label in array p_options loop
    insert into public.proposal_options (proposal_id, label, sort_order)
    values (v_proposal_id, v_label, v_index);
    v_index := v_index + 1;
  end loop;

  return v_proposal_id;
end;
$$;

-- Live tally for a proposal. Returns nothing to non-members.
create or replace function public.proposal_tally(p_proposal_id uuid)
returns table (option_id uuid, label text, vote_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.label, count(v.user_id)::bigint
  from public.proposals p
  join public.proposal_options o on o.proposal_id = p.id
  left join public.votes v on v.option_id = o.id
  where p.id = p_proposal_id
    and public.is_community_member(p.community_id)
  group by o.id, o.label, o.sort_order
  order by o.sort_order;
$$;

-- -----------------------------------------------------------------------------
-- 11. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.counties           enable row level security;
alter table public.profiles           enable row level security;
alter table public.communities        enable row level security;
alter table public.community_members  enable row level security;
alter table public.echo_messages      enable row level security;
alter table public.proposals          enable row level security;
alter table public.proposal_options   enable row level security;
alter table public.votes              enable row level security;
alter table public.market_prices      enable row level security;
alter table public.weather_cache      enable row level security;
alter table public.knowledge_articles enable row level security;

-- Counties: public reference data.
create policy counties_read on public.counties
  for select to anon, authenticated using (true);

-- Profiles: any signed-in user can see names/roles (needed for community
-- views); only the owner can edit, and the role is protected by trigger.
create policy profiles_read on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Communities: discoverable by signed-in users; only expert or cooperative
-- leaders can create them; only leaders can edit them.
create policy communities_read on public.communities
  for select to authenticated using (true);

create policy communities_create on public.communities
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.user_has_role(array['cooperative_leader', 'expert'])
  );

create policy communities_update_leader on public.communities
  for update to authenticated
  using (public.is_community_leader(id))
  with check (public.is_community_leader(id));

-- Membership: members see their community's roster; anyone can join as a
-- regular member themselves; members can leave; leaders can remove members.
create policy community_members_read on public.community_members
  for select to authenticated
  using (public.is_community_member(community_id));

create policy community_members_join on public.community_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');

create policy community_members_leave on public.community_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_community_leader(community_id));

-- Echo messages: only members read and post; senders can delete their own.
create policy echo_messages_read on public.echo_messages
  for select to authenticated
  using (public.is_community_member(community_id));

create policy echo_messages_post on public.echo_messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_community_member(community_id));

create policy echo_messages_delete_own on public.echo_messages
  for delete to authenticated
  using (sender_id = auth.uid());

-- Proposals: visible to community members; created by members as themselves.
create policy proposals_read on public.proposals
  for select to authenticated
  using (public.is_community_member(community_id));

create policy proposals_create on public.proposals
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_community_member(community_id)
    and closes_at > now()
  );

-- Options: visible wherever the proposal is visible; added only by the creator.
create policy proposal_options_read on public.proposal_options
  for select to authenticated
  using (exists (
    select 1 from public.proposals p where p.id = proposal_options.proposal_id
  ));

create policy proposal_options_create on public.proposal_options
  for insert to authenticated
  with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_options.proposal_id and p.created_by = auth.uid()
  ));

-- Votes ledger: each member sees only their own vote (tallies come from
-- proposal_tally). Insert only, once per proposal, only while open.
-- No UPDATE or DELETE policy and no grant: the ledger is append-only.
create policy votes_read_own on public.votes
  for select to authenticated
  using (user_id = auth.uid());

create policy votes_cast on public.votes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_vote(proposal_id, option_id));

-- Market prices: public feed; only cooperative leaders and experts publish.
create policy market_prices_read on public.market_prices
  for select to anon, authenticated using (true);

create policy market_prices_publish on public.market_prices
  for insert to authenticated
  with check (
    recorded_by = auth.uid()
    and public.user_has_role(array['cooperative_leader', 'expert'])
  );

-- Weather cache: public read. No write policy: only the service role writes.
create policy weather_cache_read on public.weather_cache
  for select to anon, authenticated using (true);

-- Knowledge base: published articles are public; authors manage their own.
-- Only experts can author articles.
create policy knowledge_read on public.knowledge_articles
  for select to anon, authenticated
  using (published or author_id = auth.uid());

create policy knowledge_create_expert on public.knowledge_articles
  for insert to authenticated
  with check (author_id = auth.uid() and public.user_has_role(array['expert']));

create policy knowledge_update_own on public.knowledge_articles
  for update to authenticated
  using (author_id = auth.uid() and public.user_has_role(array['expert']))
  with check (author_id = auth.uid() and public.user_has_role(array['expert']));

-- -----------------------------------------------------------------------------
-- 12. Grants (least privilege; RLS above does the row-level filtering)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.counties          to anon, authenticated;
grant select, update (full_name, county_code, preferred_language)
                                         on public.profiles to authenticated;
grant select, insert on public.communities        to authenticated;
grant update (name, description)                  on public.communities to authenticated;
grant select, insert, delete on public.community_members to authenticated;
grant select, insert, delete on public.echo_messages     to authenticated;
grant select, insert on public.proposals          to authenticated;
grant select, insert on public.proposal_options   to authenticated;
grant select, insert on public.votes              to authenticated;
grant select on public.market_prices              to anon, authenticated;
grant insert on public.market_prices              to authenticated;
grant usage on sequence public.market_prices_id_seq to authenticated;
grant select on public.weather_cache              to anon, authenticated;
grant select on public.knowledge_articles         to anon, authenticated;
grant insert, update (title, body, language, tags, published)
                                         on public.knowledge_articles to authenticated;

-- RLS policies run as the caller, so the helper functions they call need EXECUTE.
grant execute on function public.user_has_role(text[])                 to authenticated;
grant execute on function public.is_community_member(uuid)             to authenticated;
grant execute on function public.is_community_leader(uuid)            to authenticated;
grant execute on function public.can_vote(uuid, uuid)                  to authenticated;
grant execute on function public.create_proposal(uuid, text, text, timestamptz, timestamptz, text[]) to authenticated;
grant execute on function public.proposal_tally(uuid)                  to authenticated;

-- The service role (Edge Function) bypasses RLS and needs full table access
-- for scheduled cache refreshes and administrative tasks.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- -----------------------------------------------------------------------------
-- 13. Realtime: stream new Echo messages to subscribed clients.
--     RLS still applies to realtime change events.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.echo_messages;
  end if;
end;
$$;
