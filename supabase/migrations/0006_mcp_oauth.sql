-- MCP OAuth 2.1 authorization server: registered clients, short-lived
-- authorization codes, and long-lived refresh tokens. Access tokens are
-- signed JWTs (MCP_OAUTH_JWT_SECRET) and are never stored here.
--
-- Unlike links/clicks/profiles, nothing here is ever meant to be read
-- through a user's Supabase Auth session — every access path (issuing a
-- client, redeeming a code, rotating a refresh token) goes through a
-- server-side route handler on the service-role client, which bypasses
-- RLS entirely. So RLS is enabled on all three tables but intentionally
-- has zero policies for `authenticated`/`anon`: with RLS on and no
-- matching policy, Postgres denies by default, which is exactly
-- "service-role only" without needing to enumerate what to block.
begin;

create table if not exists public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id text not null unique,
  client_secret_hash text not null,
  redirect_uris text[] not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.oauth_clients enable row level security;

-- Authorization codes are single-use and short-lived (60s, enforced in the
-- token endpoint, not here — expires_at is just the value the app checks).
-- client_id below references oauth_clients.id (the internal uuid), not the
-- public-facing text client_id column, matching how clicks.link_id
-- references links.id rather than duplicating a business identifier.
create table if not exists public.oauth_authorization_codes (
  code text primary key,
  client_id uuid not null references public.oauth_clients (id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256' check (code_challenge_method = 'S256'),
  scope text not null default 'mcp:links',
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false
);

create index if not exists oauth_authorization_codes_client_id_idx
  on public.oauth_authorization_codes (client_id);

alter table public.oauth_authorization_codes enable row level security;

create table if not exists public.oauth_refresh_tokens (
  token_hash text primary key,
  client_id uuid not null references public.oauth_clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null default 'mcp:links',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists oauth_refresh_tokens_client_id_idx
  on public.oauth_refresh_tokens (client_id);

create index if not exists oauth_refresh_tokens_user_id_idx
  on public.oauth_refresh_tokens (user_id);

alter table public.oauth_refresh_tokens enable row level security;

commit;
