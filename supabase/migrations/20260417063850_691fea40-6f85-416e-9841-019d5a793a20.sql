ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_kn text,
  ADD COLUMN IF NOT EXISTS option_a_kn text,
  ADD COLUMN IF NOT EXISTS option_b_kn text,
  ADD COLUMN IF NOT EXISTS option_c_kn text,
  ADD COLUMN IF NOT EXISTS option_d_kn text;