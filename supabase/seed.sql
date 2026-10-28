-- =============================================================================
-- FarmEcho development seed.
--
-- Populates: 24 users (farmers, cooperative leaders, experts), 4 communities
-- with memberships, Echo chat threads with read receipts, a live proposal with
-- votes, market prices, and knowledge base articles for the AI assistant.
--
-- Runs automatically after migrations on `supabase db reset`. It is idempotent:
-- every insert uses ON CONFLICT DO NOTHING, so it is safe to re-run.
--
-- DEVELOPMENT ONLY. Creates auth users with a known password. Do not run this
-- against production. All demo accounts use the password below and the
-- @farmecho.test domain, which cannot receive real email.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Demo users (auth.users). The handle_new_user trigger creates each profile
--    from raw_user_meta_data (full_name, county_code, preferred_language).
--    Passwords are bcrypt hashes of 'FarmEcho!Demo2026'.
-- -----------------------------------------------------------------------------
create temporary table _seed_users (
  id        uuid primary key,
  email     text not null,
  full_name text not null,
  county    text not null,
  lang      text not null
) on commit drop;

insert into _seed_users (id, email, full_name, county, lang) values
  -- Cooperative leaders
  ('a1000000-0000-4000-8000-000000000001', 'wanjiku.kamau@farmecho.test',     'Wanjiku Kamau',       'nakuru',       'en'),
  ('a1000000-0000-4000-8000-000000000002', 'baraka.otieno@farmecho.test',     'Baraka Otieno',       'kisumu',       'sw'),
  ('a1000000-0000-4000-8000-000000000003', 'mwende.mutua@farmecho.test',      'Mwende Mutua',        'machakos',     'sw'),
  ('a1000000-0000-4000-8000-000000000004', 'kiprono.rotich@farmecho.test',    'Kiprono Rotich',      'uasin-gishu',  'en'),
  -- Agricultural experts
  ('a1000000-0000-4000-8000-000000000005', 'dr.grace.wekesa@farmecho.test',   'Dr. Grace Wekesa',    'nairobi',      'en'),
  ('a1000000-0000-4000-8000-000000000006', 'peter.njoroge@farmecho.test',     'Peter Njoroge',       'kiambu',       'en'),
  ('a1000000-0000-4000-8000-000000000007', 'asha.hassan@farmecho.test',       'Asha Hassan',         'kilifi',       'sw'),
  -- Farmers
  ('a1000000-0000-4000-8000-000000000008', 'john.mwangi@farmecho.test',       'John Mwangi',         'muranga',      'en'),
  ('a1000000-0000-4000-8000-000000000009', 'grace.wambui@farmecho.test',      'Grace Wambui',        'nyeri',        'sw'),
  ('a1000000-0000-4000-8000-000000000010', 'daniel.kipkemboi@farmecho.test',  'Daniel Kipkemboi',    'uasin-gishu',  'en'),
  ('a1000000-0000-4000-8000-000000000011', 'faith.chebet@farmecho.test',      'Faith Chebet',        'uasin-gishu',  'sw'),
  ('a1000000-0000-4000-8000-000000000012', 'samuel.kimani@farmecho.test',     'Samuel Kimani',       'nakuru',       'en'),
  ('a1000000-0000-4000-8000-000000000013', 'mary.akinyi@farmecho.test',       'Mary Akinyi',         'kisumu',       'sw'),
  ('a1000000-0000-4000-8000-000000000014', 'joseph.ochieng@farmecho.test',    'Joseph Ochieng',      'siaya',        'en'),
  ('a1000000-0000-4000-8000-000000000015', 'esther.muthoni@farmecho.test',    'Esther Muthoni',      'meru',         'sw'),
  ('a1000000-0000-4000-8000-000000000016', 'david.mutiso@farmecho.test',      'David Mutiso',        'machakos',     'en'),
  ('a1000000-0000-4000-8000-000000000017', 'rose.wanjala@farmecho.test',      'Rose Wanjala',        'bungoma',      'sw'),
  ('a1000000-0000-4000-8000-000000000018', 'eric.kiplagat@farmecho.test',     'Eric Kiplagat',       'nandi',        'en'),
  ('a1000000-0000-4000-8000-000000000019', 'lucy.wangari@farmecho.test',      'Lucy Wangari',        'nyandarua',    'sw'),
  ('a1000000-0000-4000-8000-000000000020', 'hassan.omar@farmecho.test',       'Hassan Omar',         'mombasa',      'sw'),
  ('a1000000-0000-4000-8000-000000000021', 'agnes.nyambura@farmecho.test',    'Agnes Nyambura',      'kiambu',       'en'),
  ('a1000000-0000-4000-8000-000000000022', 'george.okello@farmecho.test',     'George Okello',       'homa-bay',     'en'),
  ('a1000000-0000-4000-8000-000000000023', 'naomi.jeptoo@farmecho.test',      'Naomi Jeptoo',        'elgeyo-marakwet', 'sw'),
  ('a1000000-0000-4000-8000-000000000024', 'james.kariuki@farmecho.test',     'James Kariuki',       'laikipia',     'en');

-- Roles are set after profiles exist, below. The trigger always creates farmers.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  u.id, 'authenticated', 'authenticated', u.email,
  crypt('FarmEcho!Demo2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name, 'county_code', u.county, 'preferred_language', u.lang),
  now() - interval '120 days', now(),
  '', '', '', ''
from _seed_users u
on conflict (id) do nothing;

-- Identity rows are required for password sign-in on current Supabase Auth.
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.email, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from _seed_users u
on conflict (provider, provider_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Roles (the trigger defaults everyone to 'farmer'). Set by superuser, which
--    bypasses the protect_profile_role trigger, as intended for admin seeding.
-- -----------------------------------------------------------------------------
update public.profiles p set role = r.role
from (values
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'cooperative_leader'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'cooperative_leader'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'cooperative_leader'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'cooperative_leader'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'expert'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'expert'),
  ('a1000000-0000-4000-8000-000000000007'::uuid, 'expert')
) as r(id, role)
where p.id = r.id;

-- -----------------------------------------------------------------------------
-- 3. Communities. The creator becomes leader via the add_creator_as_leader
--    trigger. Creator is a leader or expert, as RLS requires.
-- -----------------------------------------------------------------------------
insert into public.communities (id, name, description, county_code, created_by, created_at)
values
  ('c1000000-0000-4000-8000-000000000001', 'Nakuru Maize Growers Co-op',
   'Maize and bean growers across Nakuru County. Shared inputs, market prices and pest alerts.',
   'nakuru', 'a1000000-0000-4000-8000-000000000001', now() - interval '100 days'),
  ('c1000000-0000-4000-8000-000000000002', 'Kisumu Fish & Vegetables Network',
   'Vegetable growers and fish farmers around Lake Victoria. Market linkages and cold-chain tips.',
   'kisumu', 'a1000000-0000-4000-8000-000000000002', now() - interval '90 days'),
  ('c1000000-0000-4000-8000-000000000003', 'Uasin Gishu Wheat & Dairy',
   'Wheat, dairy and fodder farmers in the Eldoret area. Fertilizer bulk buying and vet alerts.',
   'uasin-gishu', 'a1000000-0000-4000-8000-000000000004', now() - interval '80 days'),
  ('c1000000-0000-4000-8000-000000000004', 'Machakos Drought-Smart Farmers',
   'Dryland farmers sharing drought-resilient crop varieties, water harvesting and soil care.',
   'machakos', 'a1000000-0000-4000-8000-000000000003', now() - interval '70 days')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Memberships. Leaders are added by the trigger; everyone else joins here.
-- -----------------------------------------------------------------------------
insert into public.community_members (community_id, user_id, role, joined_at) values
  -- Nakuru
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 'member', now() - interval '99 days'),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000012', 'member', now() - interval '95 days'),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000008', 'member', now() - interval '60 days'),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000021', 'member', now() - interval '40 days'),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000016', 'member', now() - interval '30 days'),
  -- Kisumu
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000013', 'member', now() - interval '85 days'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000014', 'member', now() - interval '80 days'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000022', 'member', now() - interval '50 days'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 'member', now() - interval '45 days'),
  -- Uasin Gishu
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000010', 'member', now() - interval '75 days'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000011', 'member', now() - interval '70 days'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000018', 'member', now() - interval '55 days'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000023', 'member', now() - interval '20 days'),
  -- Machakos
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000015', 'member', now() - interval '65 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000019', 'member', now() - interval '60 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000017', 'member', now() - interval '35 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000007', 'member', now() - interval '25 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000020', 'member', now() - interval '15 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000024', 'member', now() - interval '10 days')
on conflict (community_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Echo messages. Fixed UUIDs keep receipts stable across re-runs.
--    Timestamps are relative to now() so the threads look recent.
-- -----------------------------------------------------------------------------
create temporary table _seed_messages (
  id           uuid primary key,
  community_id uuid not null,
  sender_id    uuid not null,
  body         text not null,
  minutes_ago  int not null
) on commit drop;

insert into _seed_messages (id, community_id, sender_id, body, minutes_ago) values
  -- Nakuru thread
  ('e1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Habari wakulima! The DAP bulk order arrives at the Nakuru depot on Thursday. Please confirm your bags by Wednesday noon.', 4320),
  ('e1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000008', 'Asante Wanjiku. I will take 10 bags for my maize plot in Nyahururu side. Is the price still KES 3,450 per 50kg?', 4300),
  ('e1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Yes, KES 3,450 per 50kg bag, delivered. Pay through the co-op M-Pesa paybill on collection.', 4290),
  ('e1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 'Reminder: at planting, apply DAP at 50 kg per acre in the furrow, then cover with soil before dropping the seed. Do not let DAP touch the seed directly.', 2880),
  ('e1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000012', 'Has anyone seen yellow streaks and stunting on the maize leaves near Subukia? I am worried about MLN.', 1440),
  ('e1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 'Samuel, thank you for reporting. Please send photos to the group. Rogue plants with mosaic and dead heart should be pulled and removed from the field, and thrips should be scouted weekly.', 1430),
  ('e1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000021', 'Noted. I will check my plots this weekend. Is certified MLN-tolerant seed available through the co-op?', 300),
  ('e1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Yes, we have certified seed from KALRO. Visit the office Friday. Bring your membership card.', 45),
  -- Kisumu thread
  ('e1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Karibu wote kwenye kundi letu jipya! Share market prices for your produce here so we can all see where to sell.', 5000),
  ('e1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000013', 'Tomatoes at Kisumu Municipal market are about KES 80 per kg this morning. Prices are falling as more farmers harvest.', 3000),
  ('e1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000014', 'Good to know. I will hold my kales until the weekend.', 2950),
  ('e1000000-0000-4000-8000-000000000014', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 'For tomatoes stored more than 2 days, keep them in a shaded, ventilated place. Do not refrigerate unripe fruit. Wash only just before sale.', 2400),
  ('e1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000022', 'Our tilapia pond water went green after the rains. What should I do?', 600),
  ('e1000000-0000-4000-8000-000000000016', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 'Green water is algae bloom from the nutrient rush. Reduce feeding for 2 days, check dissolved oxygen in the early morning, and do a 20% water change if it drops below 3 mg/L.', 590),
  -- Uasin Gishu thread
  ('e1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 'Bulk fertilizer for the season: we can order CAN and NPK together to save on transport. Reply with tonnage by Friday.', 7200),
  ('e1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000010', 'Count me in for 2 tonnes CAN. Are we paying upfront or on delivery?', 7100),
  ('e1000000-0000-4000-8000-000000000023', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000011', 'Can we get a small bag of NPK 17-17-17 for my vegetables too?', 7000),
  ('e1000000-0000-4000-8000-000000000024', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 'Yes Faith, add it. Pay on delivery for members in good standing, and an advance for new members.', 6900),
  ('e1000000-0000-4000-8000-000000000025', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000018', 'Our dairy cows have dropped milk yield this week. Anyone seen a similar change?', 1800),
  ('e1000000-0000-4000-8000-000000000026', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000023', 'Check water intake first, then feed quality. Mouldy silage cuts yield fast. If the cows also have a fever, call a vet the same day.', 1790),
  -- Machakos thread
  ('e1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', 'Mvua imechelewa mwaka huu. Plant the drought-tolerant Katumani maize only when the soil is moist to 15 cm depth, not before.', 3600),
  ('e1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000015', 'Asante. I dug the soil test and it looks good at 15 cm. I will plant with the next rain.', 3500),
  ('e1000000-0000-4000-8000-000000000033', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000019', 'Is it worth building a zai pit? I have a small plot on a slope.', 2000),
  ('e1000000-0000-4000-8000-000000000034', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000007', 'Yes, zai pits work well on slopes and dryland. Dig them 30 cm deep, 30 cm wide, spaced about 1 m apart, and add manure to each pit before planting.', 1980),
  ('e1000000-0000-4000-8000-000000000035', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000020', 'Habari. Does anyone have Mwitemania or Mtama seed to swap? Mine is finished.', 200),
  ('e1000000-0000-4000-8000-000000000036', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000024', 'I can swap 5 kg of green gram seed for sorghum. Message me to arrange pickup.', 60);

insert into public.echo_messages (id, community_id, sender_id, body, created_at)
select m.id, m.community_id, m.sender_id, m.body, now() - make_interval(mins => m.minutes_ago)
from _seed_messages m
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Read receipts. Every message is delivered to all other members. Older
--    messages are read by most recipients; the newest are only delivered.
--    A receipt is created for each (message, recipient) pair so the UI can
--    show "Delivered to 3 of 4" and "Read by 2".
--    Status rules match the migration: forward-only, never for the sender.
-- -----------------------------------------------------------------------------
insert into public.message_receipts (message_id, user_id, status, delivered_at, read_at)
select
  m.id,
  cm.user_id,
  case
    -- Recent messages are only delivered; older ones are read, with a deterministic
    -- split so the seed is stable across re-runs.
    when m.minutes_ago > 120 and (abs(hashtext(m.id::text || cm.user_id::text)) % 10) < 8 then 'read'
    when m.minutes_ago > 120 then 'delivered'
    when (abs(hashtext(m.id::text || cm.user_id::text)) % 10) < 3 then 'read'
    else 'delivered'
  end as status,
  now() - make_interval(mins => m.minutes_ago) + interval '1 minute',
  case
    when m.minutes_ago > 120 and (abs(hashtext(m.id::text || cm.user_id::text)) % 10) < 8
      then now() - make_interval(mins => m.minutes_ago) + interval '6 minutes'
    when m.minutes_ago <= 120 and (abs(hashtext(m.id::text || cm.user_id::text)) % 10) < 3
      then now() - make_interval(mins => m.minutes_ago) + interval '6 minutes'
    else null
  end
from _seed_messages m
join public.community_members cm
  on cm.community_id = m.community_id
 and cm.user_id <> m.sender_id
on conflict (message_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 7. Voting: one live proposal per community, with votes from members.
-- -----------------------------------------------------------------------------
insert into public.proposals (id, community_id, title, description, created_by, opens_at, closes_at, created_at)
values
  ('f1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
   'Bulk-buy certified MLN-tolerant maize seed for next season',
   'Pool orders through KALRO certified suppliers. Price is expected to be 10-15% below retail.',
   'a1000000-0000-4000-8000-000000000001', now() - interval '3 days', now() + interval '11 days', now() - interval '3 days'),
  ('f1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003',
   'Join the group milk cooler project',
   'Share the cost of a solar milk cooler at the Ziwa collection point.',
   'a1000000-0000-4000-8000-000000000004', now() - interval '2 days', now() + interval '20 days', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.proposal_options (id, proposal_id, label, sort_order) values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Yes, I will order', 0),
  ('f2000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'Not this season', 1),
  ('f2000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'Need more information', 2),
  ('f2000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'Yes, I will contribute', 0),
  ('f2000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000002', 'No', 1)
on conflict (id) do nothing;

-- Votes are cast as the members themselves. We insert as superuser to seed,
-- which bypasses RLS on purpose for fixtures. The one-vote-per-member key still applies.
insert into public.votes (proposal_id, user_id, option_id, cast_at)
select 'f1000000-0000-4000-8000-000000000001', cm.user_id,
       case (abs(hashtext(cm.user_id::text)) % 3)
         when 0 then 'f2000000-0000-4000-8000-000000000001'::uuid
         when 1 then 'f2000000-0000-4000-8000-000000000001'::uuid
         else 'f2000000-0000-4000-8000-000000000003'::uuid
       end,
       now() - interval '2 days'
from public.community_members cm
where cm.community_id = 'c1000000-0000-4000-8000-000000000001'
on conflict (proposal_id, user_id) do nothing;

insert into public.votes (proposal_id, user_id, option_id, cast_at)
select 'f1000000-0000-4000-8000-000000000002', cm.user_id,
       case when (abs(hashtext(cm.user_id::text)) % 2) = 0
            then 'f2000000-0000-4000-8000-000000000004'::uuid
            else 'f2000000-0000-4000-8000-000000000005'::uuid end,
       now() - interval '1 day'
from public.community_members cm
where cm.community_id = 'c1000000-0000-4000-8000-000000000003'
on conflict (proposal_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 8. Market prices (public feed). Indicative 2026 Kenyan retail/wholesale ranges
--    based on typical county markets; confirm with live data before relying on them.
-- -----------------------------------------------------------------------------
insert into public.market_prices (crop, market_name, county_code, unit, price_kes, observed_on, source, recorded_by)
values
  ('Maize (dry)',     'Nakuru Wakulima Market',  'nakuru',      '90kg bag', 4200, current_date - 1, 'cooperative', 'a1000000-0000-4000-8000-000000000001'),
  ('Maize (dry)',     'Eldoret Main Market',     'uasin-gishu', '90kg bag', 4050, current_date - 1, 'cooperative', 'a1000000-0000-4000-8000-000000000004'),
  ('Beans (rosecoco)','Machakos Town Market',    'machakos',    '90kg bag', 9500, current_date - 2, 'cooperative', 'a1000000-0000-4000-8000-000000000003'),
  ('Tomatoes',        'Kisumu Municipal Market', 'kisumu',      '1kg',        80, current_date,     'community',   'a1000000-0000-4000-8000-000000000002'),
  ('Kales (sukuma)',  'Kisumu Municipal Market', 'kisumu',      '1 bunch',    30, current_date,     'community',   'a1000000-0000-4000-8000-000000000002'),
  ('Milk',            'Eldoret Dairy Collection','uasin-gishu', '1 litre',    55, current_date - 1, 'cooperative', 'a1000000-0000-4000-8000-000000000004')
on conflict (crop, market_name, county_code, observed_on) do nothing;

-- -----------------------------------------------------------------------------
-- 9. Knowledge base for the AI assistant. Published by experts. Each article is
--    grounded in standard Kenyan agronomy: KALRO, MoALFI guidance, and general
--    agronomic practice. Rates are typical recommendations, so the article says
--    to confirm locally with an extension officer.
-- -----------------------------------------------------------------------------
insert into public.knowledge_articles (id, title, body, language, tags, author_id, published, created_at)
values
  ('b1000000-0000-4000-8000-000000000001',
   'Maize Lethal Necrosis (MLN): identification and control',
   'Maize Lethal Necrosis is caused by a combined infection of Maize chlorotic mottle virus (MCMV) and a cereal-infecting potyvirus such as Sugarcane mosaic virus. The virus combination is spread mainly by thrips and aphids, and it can also spread through infected seed and plant debris.

Symptoms: yellow streaks or chlorotic mottling on young leaves, "dead heart" in young plants, stunting, and reddening of the leaves. Infected cobs are small or empty.

Control:
1. Plant certified, MLN-tolerant seed from a recognised supplier such as KALRO.
2. Scout fields weekly from emergence. Look for thrips on leaves and check plants with streaks.
3. Pull out and destroy infected plants early, including the roots. Do not leave them in the field.
4. Keep the field free of volunteer maize and weeds, which host the vectors. Rotate with non-cereal crops such as beans.
5. Clean planting tools and avoid moving equipment from infected fields to clean ones.
6. Report suspected outbreaks to your county extension officer so the spread can be tracked.

There is no cure once a plant is infected. Prevention and early removal are the main controls.',
   'en', array['maize','MLN','disease','virus','KALRO'], 'a1000000-0000-4000-8000-000000000005', true, now() - interval '60 days'),

  ('b1000000-0000-4000-8000-000000000002',
   'Ugonjwa wa Mahindi wa MLN: utambuzi na udhibiti',
   'Ugonjwa wa MLN (Maize Lethal Necrosis) husababishwa na maambukizi mawili kwa pamoja: virusi vya MCMV na virusi vya kundi la potyvirus kama Sugarcane mosaic virus. Huenezwa hasa na thrips na aphids, na pia kupitia mbegu zilizoambukizwa na mabaki ya mimea.

Dalili: mistari ya njano au madoa ya rangi nyepesi kwenye majani machanga, "moyo mkavu" kwa mimea michanga, kudumaa, na majani kugeuka mekundu. Masuke yaliyoambukizwa ni madogo au matupu.

Udhibiti:
1. Panda mbegu zilizothibitishwa zinazostahimili MLN kutoka mtoaji anayetambulika kama KALRO.
2. Kagua shamba kila wiki tangu mahindi yanapochipua. Angalia thrips kwenye majani na mimea yenye mistari.
3. Ng''oa na uteketeze mimea iliyoambukizwa mapema, pamoja na mizizi. Usiiache shambani.
4. Weka shamba bila mahindi yaliyojiotea na magugu, kwa sababu huhifadhi wadudu wanaoeneza ugonjwa. Badilisha na mazao yasiyo ya nafaka kama maharage.
5. Safisha zana za kupanda na usihamishe vifaa kutoka shamba lililoambukizwa kwenda shamba safi.
6. Ripoti dalili kwa afisa wa ugani wa kaunti ili kufuatilia kuenea.

Mmea ukishaambukizwa hakuna tiba. Kinga na kuondoa mapema ndiyo udhibiti mkuu.',
   'sw', array['mahindi','MLN','magonjwa','virusi'], 'a1000000-0000-4000-8000-000000000005', true, now() - interval '60 days'),

  ('b1000000-0000-4000-8000-000000000003',
   'Fertilizer application rates for maize',
   'Maize responds well to balanced nutrition. These are typical recommendations for smallholders in Kenya, based on common extension guidance. Soil tests give the best rates, so confirm with your county extension officer.

At planting:
- DAP (18-46-0) at about 50 kg per acre (about 125 kg per hectare), placed in the furrow or beside the seed, never touching it.
- Cover the fertilizer with a thin layer of soil before placing the seed.

Top dressing (knee-high stage, about 4 to 6 weeks after planting):
- CAN (21-0-0) at about 50 kg per acre, applied in a band 10 cm from the plant and covered with soil.

Application tips:
- Apply when soil is moist, in the morning or evening. Avoid heavy rain right after application.
- Do not exceed the recommended rate. Extra fertilizer burns roots and wastes money.
- Keep fertilizer away from the stem.
- Record the bags per acre so you can compare yield each season.',
   'en', array['maize','fertilizer','DAP','CAN','nutrition'], 'a1000000-0000-4000-8000-000000000007', true, now() - interval '55 days'),

  ('b1000000-0000-4000-8000-000000000004',
   'Drought-resilient crops for dryland farms',
   'In dry areas such as Machakos, Kitui, Makueni and Marsabit, choose crops and varieties that tolerate low rainfall.

Good choices:
- Katumani maize, a drought-tolerant open-pollinated variety bred at KALRO Katumani for short rains.
- Sorghum and finger millet, which need much less water than maize and store well.
- Pigeon peas and green grams, which fix nitrogen and handle dry spells.
- Cowpeas, which are fast maturing and tolerant of poor soils.
- Cassava, which can stay in the ground through a long dry season.

Practices that help:
- Plant at the first reliable rains, when the soil is moist to about 15 cm.
- Use zai pits or contour bunds to catch water on slopes.
- Mulch with crop residue to slow evaporation.
- Intercrop cereals with legumes to spread risk.
- Check local seed availability, and ask your cooperative about certified stock.',
   'en', array['drought','dryland','sorghum','katumani','water'], 'a1000000-0000-4000-8000-000000000007', true, now() - interval '50 days'),

  ('b1000000-0000-4000-8000-000000000005',
   'Zai pits: water harvesting for dry, sloping land',
   'Zai pits are small planting holes that capture rainwater and concentrate manure where crops need it. They are widely used in semi-arid Kenya.

How to make them:
1. Mark rows along the contour, about 1 metre apart.
2. Dig pits about 30 cm wide and 30 cm deep, spaced about 60 to 90 cm apart along each row.
3. Put a handful of manure or compost into each pit and mix with the soil.
4. Plant seed in the pits at the start of the rains, once the soil is moist.

Benefits: water soaks into the pit rather than running off, and manure stays where the roots are. Yields can improve markedly in dry seasons.

Maintenance: rebuild the pits each season, and keep weeds out of them.',
   'en', array['zai','water harvesting','drought','soil'], 'a1000000-0000-4000-8000-000000000007', true, now() - interval '45 days'),

  ('b1000000-0000-4000-8000-000000000006',
   'Fall armyworm: scouting and integrated control',
   'Fall armyworm (Spodoptera frugiperda) attacks maize, sorghum and other grasses. Caterpillars chew leaves and feed inside the whorl. Droppings near the whorl and "window-pane" leaf damage are common early signs.

Integrated control:
1. Scout early and often, especially in the first six weeks after emergence. Check 20 plants in a few spots per acre.
2. Encourage natural enemies such as wasps and birds, and avoid spraying broad-spectrum insecticides when they are present.
3. Plant early to avoid the peak of the infestation.
4. Apply a registered biopesticide such as Bt or Metarhizium where available, following the label.
5. Where chemical control is needed, use a product registered in Kenya for fall armyworm, spray in the evening, and follow the label and withholding period.
6. Remove heavily infested plants in small fields, and do not feed leaves to livestock until the withholding period has passed.

Always check the current registration and label of any pesticide with your county agricultural officer before use.',
   'en', array['fall armyworm','pests','maize','IPM'], 'a1000000-0000-4000-8000-000000000005', true, now() - interval '40 days'),

  ('b1000000-0000-4000-8000-000000000007',
   'Bean production in Kenya: planting, spacing and pests',
   'Beans are a staple crop for smallholders and fix nitrogen in the soil, so they suit rotation with maize.

Planting:
- Plant at the start of the long or short rains, in rows about 45 cm apart with 10 cm between plants.
- Use certified seed of an adapted variety, such as Rosecoco, Canadian Wonder or a KALRO variety for your area.
- Inoculated seed with rhizobia can improve nodulation on fields that have not grown beans before.

Care:
- Beans need little nitrogen fertilizer. Phosphorus (DAP) at planting helps roots and flowering.
- Water is critical at flowering and pod filling.
- Weed early, in the first 3 to 4 weeks.

Common pests and diseases:
- Bean stem maggot and aphids: scout early, and remove heavily infested plants.
- Angular leaf spot and rust: plant clean seed, avoid overhead watering in the evening, and rotate crops.

Harvest when most pods are dry and rattle, usually 2 to 3 months after planting.',
   'en', array['beans','rotation','pests','nitrogen'], 'a1000000-0000-4000-8000-000000000005', true, now() - interval '35 days'),

  ('b1000000-0000-4000-8000-000000000008',
   'Tomato late blight and fruit care after harvest',
   'Late blight (Phytophthora infestans) spreads quickly in cool, wet weather. Brown, water-soaked patches appear on leaves and fruit, and a white mould may grow under the leaf in humid conditions.

Prevention:
- Use resistant or certified varieties where available.
- Space plants for airflow, and water at the base of plants rather than overhead.
- Remove and destroy affected leaves and fruit. Do not compost them.
- Apply a copper-based fungicide preventively during wet spells, following the label.

After harvest:
- Harvest when fruits are firm and just beginning to colour, to reduce bruising.
- Keep tomatoes in a cool, shaded, ventilated place. Do not refrigerate unripe fruit.
- Sort out damaged fruit. Wash only just before sale, because washing shortens shelf life.',
   'en', array['tomato','blight','post-harvest','market'], 'a1000000-0000-4000-8000-000000000006', true, now() - interval '30 days'),

  ('b1000000-0000-4000-8000-000000000009',
   'Fish pond water quality: green water and low oxygen',
   'Green water in a fish pond is usually an algal bloom caused by nutrients from feed, fertilizer or runoff after rain. Algae use up oxygen at night and in the early morning, which can kill fish.

Signs of danger: fish gasping at the surface in the early morning, a sudden die-off, and a sour or rotten smell.

Actions:
1. Reduce or stop feeding for 1 to 2 days.
2. Check dissolved oxygen early in the morning. Keep it above about 3 mg per litre.
3. If oxygen is low, do a partial water change of about 20 percent with clean water, and aerate the pond if possible.
4. Avoid over-stocking and over-feeding, and remove uneaten feed promptly.
5. Keep runoff from fields and latrines away from the pond.

Ask your fisheries officer or aquaculture extension service if the problem continues.',
   'en', array['fish','aquaculture','water quality','oxygen'], 'a1000000-0000-4000-8000-000000000006', true, now() - interval '25 days'),

  ('b1000000-0000-4000-8000-000000000010',
   'Dairy cow: sudden drop in milk yield',
   'A sudden fall in milk yield can have several causes, and some need a vet the same day.

Check first:
- Water intake. Cows need clean water daily. A blocked trough or a dry tank cuts milk fast.
- Feed quality. Mouldy silage, spoiled hay or a sudden change in feed reduces yield.
- Milking routine. Irregular milking, a new milker, or stress can lower output.
- Mastitis. Check each quarter for heat, swelling, clots or changes in the milk.

Call a vet the same day if:
- The cow has a fever, is off her food, or has a swollen or hot udder.
- There is blood in the milk, or the cow is lame or lying down often.

Keep records of yield each day, so you can spot the drop early and show the vet.',
   'en', array['dairy','milk','cattle','vet'], 'a1000000-0000-4000-8000-000000000006', true, now() - interval '20 days'),

  ('b1000000-0000-4000-8000-000000000011',
   'Choosing a crop for the season: a simple planning guide',
   'Before planting, decide what to grow using four checks:

1. Rainfall and season: long rains (March to May) suit maize and beans in most areas. Short rains (October to December) suit beans, vegetables and some cereals in drier zones.
2. Market: check prices in your county and at your cooperative before planting, not after harvest.
3. Labour and money: estimate seed, fertilizer, pesticide, water and labour costs. Compare with expected income.
4. Risk: spread across two or three crops so one failure does not wipe out the year.

Keep a simple record each season: what you planted, where, how much you spent, and what you harvested. After two or three seasons, you will know which crops pay best on your land.',
   'en', array['planning','market','risk','records'], 'a1000000-0000-4000-8000-000000000005', true, now() - interval '15 days')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 10. Verification. Raises an error (failing the reset) if the seed is incomplete.
-- -----------------------------------------------------------------------------
do $$
declare
  v_users int;
  v_farmers int;
  v_leaders int;
  v_experts int;
  v_articles int;
begin
  select count(*) into v_users from public.profiles where id::text like 'a1000000-%';
  select count(*) into v_farmers from public.profiles where id::text like 'a1000000-%' and role = 'farmer';
  select count(*) into v_leaders from public.profiles where id::text like 'a1000000-%' and role = 'cooperative_leader';
  select count(*) into v_experts from public.profiles where id::text like 'a1000000-%' and role = 'expert';
  select count(*) into v_articles from public.knowledge_articles where published;

  if v_users < 20 then raise exception 'seed: expected at least 20 users, found %', v_users; end if;
  if v_leaders < 1 or v_experts < 1 or v_farmers < 1 then
    raise exception 'seed: missing role coverage (farmers %, leaders %, experts %)', v_farmers, v_leaders, v_experts;
  end if;
  if v_articles < 10 then raise exception 'seed: expected at least 10 articles, found %', v_articles; end if;
  raise notice 'seed ok: % users (% farmers, % leaders, % experts), % published articles',
    v_users, v_farmers, v_leaders, v_experts, v_articles;
end;
$$;

commit;
