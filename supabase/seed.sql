-- Demo tasks so the board isn't empty on first load.
-- Run after schema.sql: Dashboard → SQL Editor → paste → Run.
-- Due dates are relative to today so every urgency colour shows: on track, due soon, overdue, done.

insert into public.tasks (title, description, type, status, assignee, due_date, context, context_tool, context_updated_at) values
  ('Add rate limiting to /login',
   'Throttle repeated failed sign-ins per IP and per account.',
   'feature', 'todo', 'Me', current_date + 4,
   '', null, null),

  ('Migrate user settings to new API',
   'Move settings reads/writes from the legacy endpoint to /v2/settings.',
   'feature', 'in-progress', 'Me', current_date,
   E'## Context\n**Background**\nLegacy /settings endpoint is being retired end of month.\n\n**Constraints**\n- No downtime; dual-read until backfill completes.\n\n**Tried so far**\nGenerated the v2 client; reads work, writes fail validation.\n\n**Pick up**\nFix the timezone field mapping, then switch writes.',
   'Claude', now() - interval '2 hours'),

  ('Checkout total rounds incorrectly',
   'Totals with 3+ discounted items are off by 1 cent.',
   'bug', 'review', 'Me', current_date - 1,
   '', null, null),

  ('Set up CI pipeline',
   'Lint, typecheck and build on every pull request.',
   'feature', 'done', 'Me', current_date - 2,
   '', null, null);
