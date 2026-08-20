ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS pos_x numeric,
  ADD COLUMN IF NOT EXISTS pos_y numeric;

CREATE OR REPLACE FUNCTION public.snapshot_note_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.restoring_note', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.note_versions (
      note_id, user_id, title, content, checklist, source, event_type,
      category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
      pos_dx, pos_dy, icon, color
    )
    VALUES (
      OLD.id, OLD.user_id, OLD.title, OLD.content, OLD.checklist, 'user', 'delete',
      OLD.category_id, OLD.parent_note_id, COALESCE(OLD.linked_note_ids, '{}'::uuid[]),
      OLD.note_type, OLD.is_collapsed, OLD.pos_dx, OLD.pos_dy, OLD.icon, OLD.color
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Los cambios que solo tocan la posición en el mapa no generan versión.
    IF ROW(
        NEW.title, NEW.content, NEW.checklist, NEW.category_id, NEW.parent_note_id,
        NEW.linked_note_ids, NEW.note_type, NEW.is_collapsed, NEW.icon, NEW.color
      ) IS NOT DISTINCT FROM ROW(
        OLD.title, OLD.content, OLD.checklist, OLD.category_id, OLD.parent_note_id,
        OLD.linked_note_ids, OLD.note_type, OLD.is_collapsed, OLD.icon, OLD.color
      ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.note_versions (
      note_id, user_id, title, content, checklist, source, event_type,
      category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
      pos_dx, pos_dy, icon, color
    )
    VALUES (
      OLD.id, OLD.user_id, OLD.title, OLD.content, OLD.checklist, 'user', 'edit',
      OLD.category_id, OLD.parent_note_id, COALESCE(OLD.linked_note_ids, '{}'::uuid[]),
      OLD.note_type, OLD.is_collapsed, OLD.pos_dx, OLD.pos_dy, OLD.icon, OLD.color
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;