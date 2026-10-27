-- Profiles, generated avatars, switching user, and a second test user.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run. Safe to run again.
-- Additive only: no existing data is changed or removed (except filling in usernames).

-- ── Profiles ────────────────────────────────────────────────────────────────
-- avatar is a short key for a picture drawn in the browser ("letter:K" or "pattern:a1b2c3"),
-- so no image files are stored anywhere. null = initials.
alter table public.members add column if not exists username text;
alter table public.members add column if not exists email text;
alter table public.members add column if not exists avatar text;

update public.members
set username = lower(regexp_replace(btrim(name), '[^A-Za-z0-9]+', '.', 'g'))
where username is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_username_key') then
    alter table public.members add constraint members_username_key unique (username);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_username_check') then
    alter table public.members add constraint members_username_check check (username ~ '^[a-z0-9][a-z0-9._-]{1,29}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_email_check') then
    alter table public.members add constraint members_email_check
      check (email is null or (char_length(email) <= 120 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_avatar_check') then
    alter table public.members add constraint members_avatar_check
      check (avatar is null or avatar ~ '^(letter:[A-Z]|pattern:[a-z0-9]{1,12})$');
  end if;
end $$;

-- ── AI activity per user ────────────────────────────────────────────────────
-- Which user a tool call ran as, so each user sees their own AI activity.
alter table public.mcp_calls add column if not exists member_id uuid references public.members (id) on delete set null;
create index if not exists mcp_calls_member_idx on public.mcp_calls (member_id, created_at desc);

-- ── A second user to test teams with ────────────────────────────────────────
-- "User 2" is in no team except their own, Studio Two (code VT-STU2), which has one project.
insert into public.members (name, username) values ('User 2', 'user2')
on conflict (name) do nothing;

insert into public.teams (name, code, description)
select 'Studio Two', 'VT-STU2', 'User 2''s team, for testing joining, leaving and removing members.'
where not exists (select 1 from public.teams where code = 'VT-STU2');

insert into public.team_members (team_id, member_id, role)
select t.id, m.id, 'owner' from public.teams t, public.members m
where t.code = 'VT-STU2' and m.name = 'User 2'
on conflict do nothing;

with team as (select id from public.teams where code = 'VT-STU2'),
     owner as (select id from public.members where name = 'User 2'),
     p as (
       insert into public.projects (name, code, client, description, team_id, created_by)
       select 'Side Project', 'SIDE', 'Studio Two', 'Only visible to members of Studio Two. Join with code VT-STU2 to see it.', team.id, owner.id
       from team, owner
       where not exists (select 1 from public.projects where code = 'SIDE' and team_id = team.id)
       returning id
     ),
     links as (
       insert into public.deliverables (project_id, kind)
       select p.id, k from p, unnest(array['presentation', 'demo', 'report', 'documentation']) as k
     )
insert into public.tasks (project_id, title, description, type, status, assignee, due_date, created_at)
select p.id, t.title, t.description, 'feature', t.status, 'User 2', current_date + t.days, now() - t.ago
from p, (values
  ('Sketch the onboarding flow', 'Three screens: welcome, connect, first task.', 'todo', 4, interval '3 minutes'),
  ('Pick a colour palette', 'Two options to show the team.', 'in-progress', 1, interval '2 minutes'),
  ('Write the README', 'How to run it locally.', 'done', -1, interval '1 minute')
) as t(title, description, status, days, ago);

alter table public.members enable row level security;
alter table public.mcp_calls enable row level security;
