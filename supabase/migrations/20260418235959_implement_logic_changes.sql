-- 1. Add status and last_updated to quiz_attempts to allow resuming and progress tracking
ALTER TABLE public.quiz_attempts 
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update policy to allow students to update their own in-progress attempts
CREATE POLICY "Anyone can update quiz attempts" ON public.quiz_attempts
  FOR UPDATE USING (true);

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quiz_attempts_modtime
    BEFORE UPDATE ON public.quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Create Leaderboard View to move aggregations to the DB
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  student_name,
  SUM(score) as total_score,
  SUM(total_questions) as total_questions,
  COUNT(id) as quiz_count,
  ROUND((SUM(score)::numeric / NULLIF(SUM(total_questions), 0)) * 100) as avg_pct
FROM public.quiz_attempts
WHERE status = 'completed'
GROUP BY student_name;

-- Grant permissions for view
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;
