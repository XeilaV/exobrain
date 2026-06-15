ALTER TABLE public.categories ALTER COLUMN is_collapsed SET DEFAULT false;
UPDATE public.categories SET is_collapsed = false;