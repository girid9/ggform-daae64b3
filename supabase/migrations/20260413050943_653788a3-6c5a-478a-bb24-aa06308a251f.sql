
-- Allow deleting quiz sessions
CREATE POLICY "Anyone can delete quiz sessions"
ON public.quiz_sessions
FOR DELETE
USING (true);
