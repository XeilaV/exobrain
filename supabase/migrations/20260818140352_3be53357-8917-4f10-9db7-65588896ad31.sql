ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.notes ALTER COLUMN category_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_parent_note_id ON public.notes(parent_note_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
ALTER TABLE public.note_versions ADD COLUMN IF NOT EXISTS color text;

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

CREATE OR REPLACE FUNCTION public.restore_note_version(_note_id uuid, _version_id uuid)
 RETURNS notes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  current_note public.notes%ROWTYPE;
  restored_note public.notes%ROWTYPE;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id AND note_id = _note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found or not accessible'; END IF;

  SELECT * INTO current_note FROM public.notes WHERE id = _note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Original note not found'; END IF;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, icon, color, restored_from_version_id
  )
  VALUES (
    current_note.id, current_note.user_id, current_note.title, current_note.content,
    current_note.checklist, 'restore', 'pre_restore', current_note.category_id,
    current_note.parent_note_id, COALESCE(current_note.linked_note_ids, '{}'::uuid[]),
    current_note.note_type, current_note.is_collapsed, current_note.pos_dx,
    current_note.pos_dy, current_note.icon, current_note.color, _version_id
  );

  PERFORM set_config('app.restoring_note', 'on', true);

  UPDATE public.notes
  SET
    title = target_version.title,
    content = target_version.content,
    checklist = target_version.checklist,
    parent_note_id = CASE
      WHEN target_version.parent_note_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.notes p
        WHERE p.id = target_version.parent_note_id AND p.user_id = auth.uid()
      ) THEN target_version.parent_note_id
      ELSE NULL
    END,
    linked_note_ids = COALESCE((
      SELECT array_agg(linked_id)
      FROM unnest(COALESCE(target_version.linked_note_ids, '{}'::uuid[])) linked_id
      WHERE EXISTS (
        SELECT 1 FROM public.notes ln
        WHERE ln.id = linked_id AND ln.user_id = auth.uid()
      )
    ), '{}'::uuid[]),
    note_type = COALESCE(target_version.note_type, current_note.note_type, 'text'),
    is_collapsed = COALESCE(target_version.is_collapsed, current_note.is_collapsed, true),
    pos_dx = target_version.pos_dx,
    pos_dy = target_version.pos_dy,
    icon = target_version.icon,
    color = COALESCE(target_version.color, current_note.color),
    updated_at = now()
  WHERE id = _note_id AND user_id = auth.uid()
  RETURNING * INTO restored_note;

  RETURN restored_note;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recover_deleted_note_version(_version_id uuid)
 RETURNS notes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  recovered_note public.notes%ROWTYPE;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found or not accessible'; END IF;

  INSERT INTO public.notes (
    user_id, category_id, parent_note_id, title, content, checklist,
    linked_note_ids, note_type, is_collapsed, pos_dx, pos_dy, icon, color
  )
  VALUES (
    target_version.user_id,
    NULL,
    CASE
      WHEN target_version.parent_note_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.notes p
        WHERE p.id = target_version.parent_note_id AND p.user_id = auth.uid()
      ) THEN target_version.parent_note_id
      ELSE NULL
    END,
    COALESCE(target_version.title, 'Nota recuperada'),
    target_version.content,
    target_version.checklist,
    COALESCE((
      SELECT array_agg(linked_id)
      FROM unnest(COALESCE(target_version.linked_note_ids, '{}'::uuid[])) linked_id
      WHERE EXISTS (
        SELECT 1 FROM public.notes ln
        WHERE ln.id = linked_id AND ln.user_id = auth.uid()
      )
    ), '{}'::uuid[]),
    COALESCE(target_version.note_type, 'text'),
    COALESCE(target_version.is_collapsed, true),
    target_version.pos_dx,
    target_version.pos_dy,
    target_version.icon,
    target_version.color
  )
  RETURNING * INTO recovered_note;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, icon, color, restored_from_version_id
  )
  VALUES (
    recovered_note.id, recovered_note.user_id, recovered_note.title, recovered_note.content,
    recovered_note.checklist, 'restore', 'recover_deleted', recovered_note.category_id,
    recovered_note.parent_note_id, COALESCE(recovered_note.linked_note_ids, '{}'::uuid[]),
    recovered_note.note_type, recovered_note.is_collapsed, recovered_note.pos_dx,
    recovered_note.pos_dy, recovered_note.icon, recovered_note.color, _version_id
  );

  RETURN recovered_note;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_note(_note_id uuid, _new_parent_id uuid DEFAULT NULL)
 RETURNS SETOF public.notes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  moving public.notes%ROWTYPE;
  target public.notes%ROWTYPE;
  root_color text;
BEGIN
  SELECT * INTO moving FROM public.notes WHERE id = _note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Note not found or not accessible'; END IF;

  IF _new_parent_id IS NOT NULL THEN
    IF _new_parent_id = _note_id THEN
      RAISE EXCEPTION 'Cannot move a note into itself';
    END IF;
    SELECT * INTO target FROM public.notes WHERE id = _new_parent_id AND user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Target note not found or not accessible'; END IF;

    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT id FROM public.notes WHERE parent_note_id = _note_id AND user_id = auth.uid()
        UNION ALL
        SELECT n.id FROM public.notes n
        JOIN descendants d ON n.parent_note_id = d.id
        WHERE n.user_id = auth.uid()
      )
      SELECT 1 FROM descendants WHERE id = _new_parent_id
    ) THEN
      RAISE EXCEPTION 'Cannot move a note into its own descendants';
    END IF;

    root_color := target.color;
    IF root_color IS NULL THEN
      root_color := moving.color;
    END IF;
  ELSE
    root_color := moving.color;
  END IF;

  UPDATE public.notes
  SET parent_note_id = _new_parent_id,
      color = root_color,
      updated_at = now()
  WHERE id = _note_id AND user_id = auth.uid();

  WITH RECURSIVE subtree AS (
    SELECT id FROM public.notes WHERE parent_note_id = _note_id AND user_id = auth.uid()
    UNION ALL
    SELECT n.id FROM public.notes n
    JOIN subtree s ON n.parent_note_id = s.id
    WHERE n.user_id = auth.uid()
  )
  UPDATE public.notes n
  SET color = root_color, updated_at = now()
  FROM subtree s
  WHERE n.id = s.id AND n.user_id = auth.uid();

  RETURN QUERY
  WITH RECURSIVE subtree AS (
    SELECT * FROM public.notes WHERE id = _note_id AND user_id = auth.uid()
    UNION ALL
    SELECT n.* FROM public.notes n
    JOIN subtree s ON n.parent_note_id = s.id
    WHERE n.user_id = auth.uid()
  )
  SELECT * FROM subtree;
END;
$function$;