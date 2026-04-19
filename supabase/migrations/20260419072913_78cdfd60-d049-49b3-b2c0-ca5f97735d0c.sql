UPDATE public.quiz_attempts qa
SET score = sub.correct_count
FROM (
  SELECT qa2.id,
    COUNT(*) FILTER (WHERE qq.correct_answer = ans.value) AS correct_count
  FROM public.quiz_attempts qa2
  CROSS JOIN LATERAL jsonb_each_text(qa2.answers) AS ans(key, value)
  JOIN public.quiz_questions qq ON qq.id::text = ans.key
  GROUP BY qa2.id
) sub
WHERE qa.id = sub.id
  AND qa.score <> sub.correct_count;