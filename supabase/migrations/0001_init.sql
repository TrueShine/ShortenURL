-- j1n.uk URL shortener schema
-- links: one row per short URL. created_by is null for anonymous links.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  target_url text not null,
  expires_at timestamptz,
  password_hash text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists links_created_by_idx on public.links (created_by);

-- clicks: one row per redirect hit, used for click-count/history stats.
create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer text
);

create index if not exists clicks_link_id_idx on public.clicks (link_id);

alter table public.links enable row level security;
alter table public.clicks enable row level security;

-- Anonymous link creation and slug resolution for redirects go through the
-- service-role client in route handlers / proxy, which bypasses RLS.
-- These policies only cover the admin dashboard, authenticated via Supabase Auth.

create policy "admin selects own links"
  on public.links for select
  to authenticated
  using (created_by = auth.uid());

create policy "admin inserts own links"
  on public.links for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "admin updates own links"
  on public.links for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "admin deletes own links"
  on public.links for delete
  to authenticated
  using (created_by = auth.uid());

create policy "admin selects clicks for own links"
  on public.clicks for select
  to authenticated
  using (
    exists (
      select 1 from public.links
      where links.id = clicks.link_id
      and links.created_by = auth.uid()
    )
  );
