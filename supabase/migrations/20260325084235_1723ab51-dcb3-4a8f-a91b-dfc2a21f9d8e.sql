
CREATE TABLE public.saved_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, hotel_id)
);

ALTER TABLE public.saved_hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved hotels"
  ON public.saved_hotels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save hotels"
  ON public.saved_hotels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave hotels"
  ON public.saved_hotels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
