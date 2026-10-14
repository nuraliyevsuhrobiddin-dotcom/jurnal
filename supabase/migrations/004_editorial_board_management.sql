-- Keep public board lookups ordered and make administrative listing predictable.
CREATE INDEX IF NOT EXISTS idx_editorial_board_active_order
  ON public.editorial_board (is_active, order_index, full_name);

CREATE OR REPLACE FUNCTION public.set_editorial_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_board_updated_at ON public.editorial_board;
CREATE TRIGGER editorial_board_updated_at
  BEFORE UPDATE ON public.editorial_board
  FOR EACH ROW EXECUTE FUNCTION public.set_editorial_board_updated_at();
