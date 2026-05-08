ALTER TABLE public.notes ALTER COLUMN is_collapsed SET DEFAULT false;
ALTER TABLE public.categories ALTER COLUMN is_collapsed SET DEFAULT false;
UPDATE public.notes SET is_collapsed = false WHERE is_collapsed = true;
UPDATE public.categories SET is_collapsed = false WHERE is_collapsed = true;