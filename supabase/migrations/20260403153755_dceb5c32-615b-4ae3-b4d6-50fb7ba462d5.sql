
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  comment text,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_review_rating
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY reviews_select_public ON public.reviews FOR SELECT USING (true);

-- Public insert (anonymous customers)
CREATE POLICY reviews_insert_public ON public.reviews FOR INSERT WITH CHECK (true);

-- Owner can delete
CREATE POLICY reviews_delete_owner ON public.reviews FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = reviews.organization_id));

-- Admin can delete
CREATE POLICY reviews_delete_admin ON public.reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_reviews_organization_id ON public.reviews(organization_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
