import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal } from "lucide-react";

interface LeaderEntry {
  student_name: string;
  bestScore: number;
  totalQuestions: number;
  attempts: number;
}

interface Props {
  sessionId?: string;
}

interface QuizAttemptRow {
  student_name: string;
  score: number;
  total_questions: number;
}

const Leaderboard = ({ sessionId }: Props) => {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      let query = supabase.from("quiz_attempts").select("*");
      if (sessionId) query = query.eq("session_id", sessionId);
      const { data } = await query;
      if (!data) return;

      const map: Record<string, LeaderEntry> = {};
      data.forEach((attempt: QuizAttemptRow) => {
        const key = attempt.student_name.toLowerCase();
        if (!map[key]) {
          map[key] = {
            student_name: attempt.student_name,
            bestScore: 0,
            totalQuestions: attempt.total_questions,
            attempts: 0,
          };
        }
        map[key].attempts++;
        const pct = Math.round((attempt.score / attempt.total_questions) * 100);
        if (pct > map[key].bestScore) {
          map[key].bestScore = pct;
          map[key].student_name = attempt.student_name;
          map[key].totalQuestions = attempt.total_questions;
        }
      });
      setEntries(Object.values(map).sort((a, b) => b.bestScore - a.bestScore));
    };
    void load();
  }, [sessionId]);

  if (entries.length === 0) return null;

  const medalStyles = [
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-200",
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  ];

  return (
    <section className="surface-panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="eyebrow">Session leaderboard</p>
          <h2 className="mt-1 text-xl font-extrabold text-foreground">Best scores in this quiz</h2>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {entries.slice(0, 10).map((entry, index) => (
          <div
            key={entry.student_name}
            className="flex items-center gap-3 rounded-[22px] border border-border bg-background/80 px-4 py-3"
          >
            <div className="flex w-10 justify-center">
              {index < 3 ? (
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${medalStyles[index]}`}
                >
                  <Medal className="h-4 w-4" />
                </span>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{entry.student_name}</p>
              <p className="text-xs text-muted-foreground">
                {entry.attempts} attempt{entry.attempts === 1 ? "" : "s"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-extrabold text-foreground">{entry.bestScore}%</p>
              <p className="text-xs text-muted-foreground">best</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Leaderboard;
