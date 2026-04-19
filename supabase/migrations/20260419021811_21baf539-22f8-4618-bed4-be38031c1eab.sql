CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
USING (true);

INSERT INTO public.app_config (key, value) VALUES ('version', '1')
ON CONFLICT (key) DO NOTHING;