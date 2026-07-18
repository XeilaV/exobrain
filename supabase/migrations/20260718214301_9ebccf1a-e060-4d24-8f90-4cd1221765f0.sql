CREATE OR REPLACE FUNCTION public.restore_note_version(_note_id uuid, _version_id uuid)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  current_note public.notes%ROWTYPE;
  restored_note public.notes%ROWTYPE;
  fallback_category uuid;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id
    AND note_id = _note_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found or not accessible';
  END IF;

  SELECT * INTO current_note
  FROM public.notes
  WHERE id = _note_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original note not found';
  END IF;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, icon, restored_from_version_id
  )
  VALUES (
    current_note.id, current_note.user_id, current_note.title, current_note.content,
    current_note.checklist, 'restore', 'pre_restore', current_note.category_id,
    current_note.parent_note_id, COALESCE(current_note.linked_note_ids, '{}'::uuid[]),
    current_note.note_type, current_note.is_collapsed, current_note.pos_dx,
    current_note.pos_dy, current_note.icon, _version_id
  );

  fallback_category := target_version.category_id;
  IF fallback_category IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = fallback_category AND c.user_id = auth.uid()
  ) THEN
    fallback_category := current_note.category_id;
  END IF;

  PERFORM set_config('app.restoring_note', 'on', true);

  UPDATE public.notes
  SET
    title = target_version.title,
    content = target_version.content,
    checklist = target_version.checklist,
    category_id = fallback_category,
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
    updated_at = now()
  WHERE id = _note_id
    AND user_id = auth.uid()
  RETURNING * INTO restored_note;

  RETURN restored_note;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recover_deleted_note_version(_version_id uuid)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  recovered_note public.notes%ROWTYPE;
  fallback_category uuid;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found or not accessible';
  END IF;

  fallback_category := target_version.category_id;
  IF fallback_category IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = fallback_category AND c.user_id = auth.uid()
  ) THEN
    SELECT id INTO fallback_category
    FROM public.categories
    WHERE user_id = auth.uid()
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF fallback_category IS NULL THEN
    RAISE EXCEPTION 'No category available to recover note';
  END IF;

  INSERT INTO public.notes (
    user_id, category_id, parent_note_id, title, content, checklist,
    linked_note_ids, note_type, is_collapsed, pos_dx, pos_dy, icon
  )
  VALUES (
    target_version.user_id,
    fallback_category,
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
    target_version.icon
  )
  RETURNING * INTO recovered_note;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, icon, restored_from_version_id
  )
  VALUES (
    recovered_note.id, recovered_note.user_id, recovered_note.title, recovered_note.content,
    recovered_note.checklist, 'restore', 'recover_deleted', recovered_note.category_id,
    recovered_note.parent_note_id, COALESCE(recovered_note.linked_note_ids, '{}'::uuid[]),
    recovered_note.note_type, recovered_note.is_collapsed, recovered_note.pos_dx,
    recovered_note.pos_dy, recovered_note.icon, _version_id
  );

  RETURN recovered_note;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.restore_note_version(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recover_deleted_note_version(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_note_version(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recover_deleted_note_version(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_note_version(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recover_deleted_note_version(uuid) TO authenticated;