ALTER TABLE public.notes ALTER COLUMN pos_dx DROP NOT NULL, ALTER COLUMN pos_dx DROP DEFAULT, ALTER COLUMN pos_dy DROP NOT NULL, ALTER COLUMN pos_dy DROP DEFAULT;
ALTER TABLE public.categories ALTER COLUMN pos_dx DROP NOT NULL, ALTER COLUMN pos_dx DROP DEFAULT, ALTER COLUMN pos_dy DROP NOT NULL, ALTER COLUMN pos_dy DROP DEFAULT;
UPDATE public.notes SET pos_dx = NULL, pos_dy = NULL WHERE pos_dx = 0 AND pos_dy = 0;
UPDATE public.categories SET pos_dx = NULL, pos_dy = NULL WHERE pos_dx = 0 AND pos_dy = 0;