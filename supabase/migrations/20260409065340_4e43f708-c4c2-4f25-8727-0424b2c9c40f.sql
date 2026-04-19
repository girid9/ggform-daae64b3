
-- Quiz questions bank (768 questions)
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz sessions (each quiz link created by tutor)
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  question_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Student quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Public read access for quiz questions (needed to display in quiz)
CREATE POLICY "Anyone can read quiz questions" ON public.quiz_questions
  FOR SELECT USING (true);

-- Public read access for quiz sessions (students access via link)
CREATE POLICY "Anyone can read quiz sessions" ON public.quiz_sessions
  FOR SELECT USING (true);

-- Public insert for quiz sessions (tutor creates without auth)
CREATE POLICY "Anyone can create quiz sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (true);

-- Public read for quiz attempts (tutor views results)
CREATE POLICY "Anyone can read quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (true);

-- Public insert for quiz attempts (students submit answers)
CREATE POLICY "Anyone can create quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_quiz_sessions_code ON public.quiz_sessions(session_code);
CREATE INDEX idx_quiz_attempts_session ON public.quiz_attempts(session_id);
