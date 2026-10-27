-- Vibe Tracker schema (fresh install).
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

-- Placeholder people (tasks are assigned to them; "Me" is the current user until auth exists).
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now()
);

-- Teams, joined by code (VT-XXXX). Projects can belong to a team.
create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  code         text not null unique check (code ~ '^VT-[A-Z0-9]{4}$'),
  description  text not null default '' check (char_length(description) <= 300),
  created_at   timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (team_id, member_id)
);
create index if not exists team_members_member_idx on public.team_members (member_id);

-- A project is personal (team_id null) or belongs to a team; created_by records its creator.
-- Visible to: its creator, and every member of its team.
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid references public.teams (id) on delete set null,
  created_by   uuid references public.members (id) on delete set null,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  code         text not null check (code ~ '^[A-Z0-9]{2,6}$'),
  client       text not null default '' check (char_length(client) <= 80),
  description  text not null default '' check (char_length(description) <= 500),
  status       text not null default 'active' check (status in ('active', 'on-hold', 'completed')),
  is_demo      boolean not null default false,  -- the demo board, reset from the Connect page
  created_at   timestamptz not null default now()
);

-- Colour labels. `color` is a fixed palette key the UI maps to classes.
create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 1 and 40),
  color       text not null check (color in ('blue', 'violet', 'pink', 'orange', 'teal', 'slate')),
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  title               text not null,
  description         text not null default '',
  type                text not null default 'feature' check (type in ('feature', 'bug')),
  status              text not null default 'todo'
                        check (status in ('todo', 'in-progress', 'review', 'done')),
  assignee            text not null default 'Me',          -- a members.name
  label_id            uuid references public.labels (id) on delete set null,
  due_date            date,
  due_time            time,                                -- optional; null = end of day
  created_date        date not null default current_date,
  context             text not null default '',
  context_tool        text check (context_tool in ('Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other')),
  context_updated_at  timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists projects_team_idx on public.projects (team_id);

-- AI prompt history per task, newest first in the UI.
create table if not exists public.task_prompts (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  tool        text check (tool in ('Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other')),
  prompt      text not null check (char_length(btrim(prompt)) between 1 and 20000),
  created_at  timestamptz not null default now()
);
create index if not exists task_prompts_task_id_idx on public.task_prompts (task_id, created_at desc);

-- Pinned links per project. Rows are created with the project.
create table if not exists public.deliverables (
  project_id  uuid not null references public.projects (id) on delete cascade,
  kind        text not null check (kind in ('presentation', 'demo', 'report', 'documentation')),
  url         text not null default '',
  primary key (project_id, kind)
);

-- RLS on with NO policies: the public (publishable/anon) key can read or write nothing.
-- The app talks to Supabase only from the server with the secret key, which bypasses RLS.
alter table public.members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.labels enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_prompts enable row level security;
alter table public.deliverables enable row level security;

-- History of what happened to tasks (moves, handoffs, creation). Feeds the handoff map.
create table if not exists public.task_events (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  kind        text not null check (kind in ('created', 'moved', 'handoff')),
  from_value  text,
  to_value    text,
  actor       text not null default 'Me',
  created_at  timestamptz not null default now()
);
create index if not exists task_events_project_idx on public.task_events (project_id, created_at desc);

-- "task_id is blocked by depends_on". Both tasks must be in the same project (checked in the app).
create table if not exists public.task_dependencies (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  depends_on  uuid not null references public.tasks (id) on delete cascade,
  active      boolean not null default true,   -- inactive links stay visible but don't block
  created_at  timestamptz not null default now(),
  primary key (task_id, depends_on),
  check (task_id <> depends_on)
);
create index if not exists task_dependencies_depends_on_idx on public.task_dependencies (depends_on);

alter table public.task_events enable row level security;
alter table public.task_dependencies enable row level security;

-- AI connections (MCP): each has a secret that is part of its connector URL. Only a SHA-256
-- hash of the secret is stored; `token_hint` is its first characters, to tell them apart.
create table if not exists public.mcp_connections (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  token_hash    text not null unique,
  token_hint    text not null,
  can_write     boolean not null default false,
  project_id    uuid references public.projects (id) on delete cascade,   -- null = every project you can see
  created_by    uuid references public.members (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

-- Every tool call made by an AI connection or the in-app "Try it" panel.
create table if not exists public.mcp_calls (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid references public.mcp_connections (id) on delete cascade,  -- null = Try it panel
  caller         text not null,
  tool           text not null,
  summary        text not null default '',
  ok             boolean not null,
  detail         jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists mcp_calls_created_idx on public.mcp_calls (created_at desc);
create index if not exists mcp_calls_connection_idx on public.mcp_calls (connection_id, created_at desc);

-- Previous versions of a task's context, saved whenever an AI replaces it.
create table if not exists public.task_context_history (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks (id) on delete cascade,
  context       text not null,
  context_tool  text,
  replaced_by   text not null,
  created_at    timestamptz not null default now()
);
create index if not exists task_context_history_task_idx on public.task_context_history (task_id, created_at desc);

alter table public.mcp_connections enable row level security;
alter table public.mcp_calls enable row level security;
alter table public.task_context_history enable row level security;
