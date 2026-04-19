-- Add subject_id to quiz_questions to cleanly bucket topics
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS subject_id text;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_subject_topic
  ON public.quiz_questions(subject_id, topic);

-- Per-topic study scores
CREATE TABLE IF NOT EXISTS public.topic_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  subject_id text NOT NULL,
  topic text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  percentage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic_scores_lookup
  ON public.topic_scores(subject_id, topic, student_name);

ALTER TABLE public.topic_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read topic scores"
  ON public.topic_scores FOR SELECT USING (true);

CREATE POLICY "Anyone can create topic scores"
  ON public.topic_scores FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete topic scores"
  ON public.topic_scores FOR DELETE USING (true);

-- Allow inserting questions (currently blocked) so the import can run
CREATE POLICY "Anyone can insert quiz questions"
  ON public.quiz_questions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update quiz questions"
  ON public.quiz_questions FOR UPDATE USING (true) WITH CHECK (true);