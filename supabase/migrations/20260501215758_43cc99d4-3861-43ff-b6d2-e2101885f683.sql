-- Add brain_name and onboarded to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brain_name TEXT NOT NULL DEFAULT 'ExoBrain',
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;

-- Add is_collapsed to notes (folded by default)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT true;