create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null,
  quote text default '',
  photo_url text default '',
  photo_path text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text default '',
  photo_url text default '',
  photo_path text default '',
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  caption text default '',
  album text not null default 'General',
  url text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text default '',
  category text not null default 'activity' check (category in ('activity', 'dumb')),
  cover_url text default '',
  cover_path text default '',
  event_date date,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  subject text default '',
  url text not null,
  path text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table settings enable row level security;
alter table officers  enable row level security;
alter table students  enable row level security;
alter table photos    enable row level security;
alter table posts     enable row level security;
alter table notes     enable row level security;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_public_read'
  ) then
    create policy "media_public_read"
      on storage.objects for select
      using (bucket_id = 'media');
  end if;
end $$;

insert into settings (key, value)
values (
  'site',
  '{
    "title": "IT1A",
    "tagline": "BSIT · DORSU",
    "heroText": "The official den of IT1A — where code, chaos and camaraderie collide. We build projects, survive exams, and document every gloriously dumb moment in between.",
    "about": "IT1A is a section of BSIT students at Davao Oriental State University. By day we write programs and pass (most) exams — by night we turn everything ridiculous we did along the way into content. This site is our archive: the wins, the losses, and the memories that live rent-free in the class group chat."
  }'::jsonb
)
on conflict (key) do nothing;
