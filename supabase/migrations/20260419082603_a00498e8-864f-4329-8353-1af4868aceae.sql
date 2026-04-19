ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS note_type text NOT NULL DEFAULT 'text';

-- Validation trigger to constrain values (avoids immutable check constraint issues)
CREATE OR REPLACE FUNCTION public.validate_note_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.note_type NOT IN ('text', 'checklist') THEN
    RAISE EXCEPTION 'Invalid note_type: %. Must be text or checklist.', NEW.note_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_note_type_trigger ON public.notes;
CREATE TRIGGER validate_note_type_trigger
BEFORE INSERT OR UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.validate_note_type();