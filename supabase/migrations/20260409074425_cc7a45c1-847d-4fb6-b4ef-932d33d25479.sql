CREATE POLICY "Anyone can update quiz sessions"
ON public.quiz_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);