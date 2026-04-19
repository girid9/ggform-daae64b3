CREATE TABLE public.daily_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject_id TEXT NOT NULL,
  topic_ids INTEGER[] NOT NULL,
  share_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily topics" ON public.daily_topics FOR SELECT USING (true);
CREATE POLICY "Anyone can create daily topics" ON public.daily_topics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update daily topics" ON public.daily_topics FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete daily topics" ON public.daily_topics FOR DELETE USING (true);