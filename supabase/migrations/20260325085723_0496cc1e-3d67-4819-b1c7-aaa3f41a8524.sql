ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS rating_score numeric DEFAULT NULL;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;