-- Mock tasks so the board isn't empty on first load (M4).
-- Run after schema.sql: Dashboard → SQL Editor → paste → Run.

insert into public.tasks (title, description, type, status, assignee, due_date) values
  ('Render the four-column board', 'Columns from STAGES, cards show title + assignee.', 'feature', 'todo',        'Me', current_date + 3),
  ('Add / edit / delete modal',    'One modal for create and edit, with a status dropdown.', 'feature', 'in-progress', 'Me', current_date + 1),
  ('Fix card overflow on mobile',  'Long titles push the card wider than the column.', 'bug',     'review',      'Me', current_date - 1),
  ('Set up Supabase backend',      'Tables, RLS, server-only secret key.', 'feature', 'done',        'Me', current_date);
