REVOKE EXECUTE ON FUNCTION public.snapshot_note_version() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_note_version() FROM anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_note_version() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_note_type() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_note_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_note_type() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.snapshot_note_version() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_note_type() TO service_role;