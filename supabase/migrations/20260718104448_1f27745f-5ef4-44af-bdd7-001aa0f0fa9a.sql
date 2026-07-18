
-- Credentials (server-only)
CREATE TABLE public.google_calendar_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_api_key text NOT NULL,
  email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  last_sync_at timestamptz,
  sync_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_calendar_credentials TO service_role;
ALTER TABLE public.google_calendar_credentials ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated: only service_role can access.

-- Sync mapping between local tasks and google events
CREATE TABLE public.google_calendar_sync (
  task_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  event_id text,
  calendar_id text NOT NULL DEFAULT 'primary',
  sync_status text NOT NULL DEFAULT 'pending',
  last_google_update timestamptz,
  last_local_update timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_sync TO authenticated;
GRANT ALL ON public.google_calendar_sync TO service_role;
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gcal sync" ON public.google_calendar_sync
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX google_calendar_sync_user_idx ON public.google_calendar_sync(user_id);
CREATE INDEX google_calendar_sync_event_idx ON public.google_calendar_sync(user_id, event_id);

-- Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_calendar_email text;
