-- Vibe Tracker schema (fresh install).
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  code         text not null check (code ~ '^[A-Z0-9]{2,6}$'),
  client       text not null default '' check (char_length(client) <= 80),
  description  text not null default '' check (char_length(description) <= 500),
  status       text not null default 'active' check (status in ('active', 'on-hold', 'completed')),
  created_at   timestamptz not null default now()
);

-- Placeholder people a task can be assigned to.
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now()
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
alter table public.labels enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_prompts enable row level security;
alter table public.deliverables enable row level security;
