-- ============================================================
-- Codefusion – Supabase PostgreSQL Schema
-- Migration: 001_initial_schema
-- ============================================================
-- Best-practice notes applied:
--   • UUIDs used for all PKs (exposed in API / distributed-safe).
--     Supabase already ships with uuid-ossp & pgcrypto, so
--     gen_random_uuid() works out of the box.
--   • auth.users is the authoritative identity source; profiles
--     stores app-level data and is kept in sync via trigger.
--   • Every FK column is explicitly indexed (10-100x faster JOINs).
--   • RLS enabled on every table; policies use (select auth.uid())
--     so the function is evaluated once per query, not per row.
--   • updated_at columns are maintained by a shared trigger.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 0.  HELPERS
-- ──────────────────────────────────────────────────────────────

-- Automatically bump updated_at on any row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ──────────────────────────────────────────────────────────────
-- 1.  PROFILES
--     Mirrors auth.users; one row per registered user.
--     The trigger below keeps it in sync automatically.
-- ──────────────────────────────────────────────────────────────

create table public.profiles (
  -- FK to Supabase Auth – same UUID as auth.users.id
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  -- Freemium tier: 'free' | 'pro' | 'team'
  plan        text not null default 'free'
                check (plan in ('free', 'pro', 'team')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at fresh
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    -- Fall back to the local-part of their email if no username metadata
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "profiles_select_own"   on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles_update_own"   on public.profiles
  for update using ((select auth.uid()) = id);

-- Public read so collaborators can resolve display names
create policy "profiles_select_public" on public.profiles
  for select using (true);


-- ──────────────────────────────────────────────────────────────
-- 2.  PROJECTS
-- ──────────────────────────────────────────────────────────────

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  -- Default editor language for the project
  language    text not null default 'python'
                check (language in ('python', 'javascript', 'typescript', 'go', 'rust', 'bash')),
  is_private  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Index: filter by owner (most common query)
create index projects_owner_id_idx on public.projects (owner_id);
-- Index: public project discovery (is_private = false)
create index projects_is_private_idx on public.projects (is_private) where is_private = false;

-- RLS
alter table public.projects enable row level security;

-- Owner can do anything
create policy "projects_owner_all" on public.projects
  for all using ((select auth.uid()) = owner_id);

-- Collaborators can read their projects (joined via project_members)
create policy "projects_collaborator_select" on public.projects
  for select using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = id
        and pm.user_id = (select auth.uid())
    )
  );

-- Anyone can see public projects
create policy "projects_public_select" on public.projects
  for select using (is_private = false);


-- ──────────────────────────────────────────────────────────────
-- 3.  PROJECT MEMBERS  (collaborators + roles)
-- ──────────────────────────────────────────────────────────────

create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- 'viewer' can read; 'editor' can edit files; 'admin' can invite others
  role        text not null default 'editor'
                check (role in ('viewer', 'editor', 'admin')),
  invited_by  uuid references public.profiles (id) on delete set null,
  joined_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Index every FK column (10-100x faster JOINs & cascades)
create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_user_id_idx   on public.project_members (user_id);

-- RLS
alter table public.project_members enable row level security;

-- Members can see the membership list for their own projects
create policy "project_members_select" on public.project_members
  for select using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = (select auth.uid())
    )
  );

-- Only the project owner (or an admin member) can insert / delete
create policy "project_members_manage" on public.project_members
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'admin'
    )
  );


-- ──────────────────────────────────────────────────────────────
-- 4.  FILES  (folder hierarchy stored as a path string)
-- ──────────────────────────────────────────────────────────────

create table public.files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  -- e.g. '/src/main.py', '/'  (root)
  path        text not null,
  -- NULL for directories; text content for files
  content     text,
  is_folder   boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, path)
);

create trigger files_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- Index: look up all files in a project
create index files_project_id_idx on public.files (project_id);
-- Index: navigate the tree by path prefix
create index files_project_path_idx on public.files (project_id, path);
-- Index: used in RLS policy lookups
create index files_created_by_idx on public.files (created_by);

-- RLS
alter table public.files enable row level security;

-- Helper to check project access (avoids repeating the join)
create or replace function private.can_access_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and (
        pr.owner_id = (select auth.uid())
        or pr.is_private = false
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p_project_id
            and pm.user_id = (select auth.uid())
        )
      )
  );
$$;

-- Revoke direct access from all roles (only used internally by policies)
revoke execute on function private.can_access_project(uuid)
  from public, anon, authenticated, service_role;

create policy "files_select" on public.files
  for select using ((select private.can_access_project(project_id)));

create policy "files_insert" on public.files
  for insert with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = (select auth.uid())
        and pm.role in ('editor', 'admin')
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create policy "files_update" on public.files
  for update using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = (select auth.uid())
        and pm.role in ('editor', 'admin')
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

create policy "files_delete" on public.files
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'admin'
    )
  );


-- ──────────────────────────────────────────────────────────────
-- 5.  VERSION HISTORY  (file snapshots)
-- ──────────────────────────────────────────────────────────────

create table public.file_versions (
  id          uuid primary key default gen_random_uuid(),
  file_id     uuid not null references public.files (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  content     text not null,
  -- Short message describing the snapshot (optional)
  label       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Index: fetch history for a specific file (most common query)
create index file_versions_file_id_idx    on public.file_versions (file_id, created_at desc);
-- Index: project-level history browsing
create index file_versions_project_id_idx on public.file_versions (project_id);

-- RLS: same access rules as files
alter table public.file_versions enable row level security;

create policy "file_versions_select" on public.file_versions
  for select using ((select private.can_access_project(project_id)));

create policy "file_versions_insert" on public.file_versions
  for insert with check ((select private.can_access_project(project_id)));


-- ──────────────────────────────────────────────────────────────
-- 6.  CHAT MESSAGES
-- ──────────────────────────────────────────────────────────────

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  -- Allow threaded replies (NULL = top-level)
  parent_id   uuid references public.chat_messages (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Soft-delete support
  deleted_at  timestamptz
);

-- Index: paginate messages per project (cursor-based pagination)
create index chat_messages_project_created_idx
  on public.chat_messages (project_id, created_at desc);
-- Index: FK lookups
create index chat_messages_user_id_idx   on public.chat_messages (user_id);
create index chat_messages_parent_id_idx on public.chat_messages (parent_id)
  where parent_id is not null;
-- Partial index: exclude soft-deleted messages from most queries
create index chat_messages_active_idx
  on public.chat_messages (project_id, created_at desc)
  where deleted_at is null;

-- RLS
alter table public.chat_messages enable row level security;

create policy "chat_select" on public.chat_messages
  for select using ((select private.can_access_project(project_id)));

create policy "chat_insert" on public.chat_messages
  for insert with check (
    (select auth.uid()) = user_id
    and (select private.can_access_project(project_id))
  );

-- Users can only soft-delete their own messages
create policy "chat_update_own" on public.chat_messages
  for update using ((select auth.uid()) = user_id);

-- Hard-delete only by project owner
create policy "chat_delete_owner" on public.chat_messages
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );


-- ──────────────────────────────────────────────────────────────
-- 7.  AI REQUESTS  (audit log + rate-limiting source)
-- ──────────────────────────────────────────────────────────────

create table public.ai_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  project_id      uuid references public.projects (id) on delete set null,
  -- 'completion' | 'explanation' | 'bug_fix'
  request_type    text not null
                    check (request_type in ('completion', 'explanation', 'bug_fix')),
  prompt_tokens   integer,
  completion_tokens integer,
  -- Was the suggestion accepted by the user?
  accepted        boolean,
  created_at      timestamptz not null default now()
);

-- Index: count requests per user per day (rate limiting)
create index ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);
-- Index: project-level AI analytics
create index ai_requests_project_id_idx on public.ai_requests (project_id)
  where project_id is not null;

-- RLS
alter table public.ai_requests enable row level security;

create policy "ai_requests_own" on public.ai_requests
  for all using ((select auth.uid()) = user_id);


-- ──────────────────────────────────────────────────────────────
-- 8.  EXECUTION LOGS  (code sandbox output)
-- ──────────────────────────────────────────────────────────────

create table public.execution_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  language    text not null,
  -- The code that was executed (snapshot)
  code        text not null,
  stdout      text,
  stderr      text,
  exit_code   integer,
  -- Wall-clock ms the sandbox took
  duration_ms integer,
  created_at  timestamptz not null default now()
);

-- Index: recent runs per project
create index execution_logs_project_created_idx
  on public.execution_logs (project_id, created_at desc);
create index execution_logs_user_id_idx on public.execution_logs (user_id);

-- RLS
alter table public.execution_logs enable row level security;

create policy "execution_logs_select" on public.execution_logs
  for select using ((select private.can_access_project(project_id)));

create policy "execution_logs_insert" on public.execution_logs
  for insert with check (
    (select auth.uid()) = user_id
    and (select private.can_access_project(project_id))
  );


-- ──────────────────────────────────────────────────────────────
-- 9.  ENABLE REALTIME  (Supabase Realtime broadcast)
--     Needed for the collaborative editor + chat.
-- ──────────────────────────────────────────────────────────────

-- Add tables to the realtime publication so clients can subscribe
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.project_members;
