CREATE TABLE public.note_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_versions TO authenticated;
GRANT ALL ON public.note_versions TO service_role;

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own note versions"
ON public.note_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.snapshot_note_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.note_versions (note_id, content, checklist, source)
  VALUES (OLD.id, OLD.content, OLD.checklist, 'user');

  DELETE FROM public.note_versions
  WHERE id IN (
    SELECT id FROM public.note_versions
    WHERE note_id = OLD.id
    ORDER BY created_at DESC
    OFFSET 30
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER note_version_snapshot
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_note_version();

CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id);
CREATE INDEX idx_note_versions_created_at ON public.note_versions(created_at DESC);