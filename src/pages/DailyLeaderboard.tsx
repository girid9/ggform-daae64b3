import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Medal, Share2, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { DailyViewSkeleton } from "@/components/PageSkeletons";
import { toast } from "sonner";
import curriculumData from "@/data/curriculum.json";

interface AttemptRow {
  id: string;
  student_name: string;
  score: number;
  total_questions: number;
  created_at: string;
  session_id: string;
}

interface SessionRow {
  id: string;
  name: string;
  session_code: string;
}

interface LeaderEntry {
  name: string;
  bestPct: number;
  bestScore: number;
  bestTotal: number;
  attempts: number;
  sessionName?: string;
}

const DailyLeaderboard = () => {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionRow>>({});

  useEffect(() => {
    const load = async () => {
      if (!code) {
        setError("Missing share code.");
        setLoading(false);
        return;
      }

      const { data: daily, error: dailyErr } = await supabase
        .from("daily_topics")
        .select("*")
        .eq("share_code", code)
        .maybeSingle();

      if (dailyErr || !daily) {
        setError("This leaderboard link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setDate(daily.date);
      setSubjectId(daily.subject_id);

      // Load all attempts created on that date
      const start = `${daily.date}T00:00:00.000Z`;
      const endDate = new Date(daily.date);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = endDate.toISOString();

      const { data: attemptRows } = await supabase
        .from("quiz_attempts")
        .select("id, student_name, score, total_questions, created_at, session_id")
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      const rows = (attemptRows ?? []) as AttemptRow[];
      setAttempts(rows);

      const sessionIds = Array.from(new Set(rows.map((r) => r.session_id).filter(Boolean)));
      if (sessionIds.length > 0) {
        const { data: sessionRows } = await supabase
          .from("quiz_sessions")
          .select("id, name, session_code")
          .in("id", sessionIds);
        const map: Record<string, SessionRow> = {};
        (sessionRows ?? []).forEach((s) => {
          map[s.id] = s as SessionRow;
        });
        setSessions(map);
      }

      setLoading(false);
    };

    void load();
  }, [code]);

  const subject = curriculumData.subjects.find((item) => item.id === subjectId);

  const leaders: LeaderEntry[] = useMemo(() => {
    const map = new Map<string, LeaderEntry>();
    attempts.forEach((a) => {
      const completed = a.total_questions > 0 && a.score >= 0;
      if (!completed) return;
      const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0;
      const key = a.student_name.trim().toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name: a.student_name.trim(),
          bestPct: pct,
          bestScore: a.score,
          bestTotal: a.total_questions,
          attempts: 1,
          sessionName: sessions[a.session_id]?.name,
        });
      } else {
        existing.attempts += 1;
        if (pct > existing.bestPct) {
          existing.bestPct = pct;
          existing.bestScore = a.score;
          existing.bestTotal = a.total_questions;
          existing.sessionName = sessions[a.session_id]?.name ?? existing.sessionName;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.bestPct - a.bestPct);
  }, [attempts, sessions]);

  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const uniqueStudents = leaders.length;
    const avg =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce(
              (sum, a) => sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
              0,
            ) / totalAttempts,
          )
        : 0;
    return { totalAttempts, uniqueStudents, avg };
  }, [attempts, leaders.length]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Daily Leaderboard", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      // user cancelled or unsupported
    }
  };

  if (loading) {
    return <DailyViewSkeleton />;
  }

  if (error) {
    return (
      <div className="page-bg flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel w-full max-w-md p-8 text-center">
          <h1 className="text-3xl font-extrabold">Link not available</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{error}</p>
          <Button asChild className="btn-primary mt-6 h-12 w-full text-sm">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="page-bg min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <DarkModeToggle />
        </div>

        <section className="hero-shell mt-5 p-6 sm:p-8">
          <span className="chip-primary">Daily leaderboard</span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-[2.5rem]">
            {subject?.icon ?? "🏆"} {subject?.name ? `${subject.name} —` : ""} Top scores
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{formattedDate}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="metric-card">
              <Users className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
              <p className="mt-1 text-2xl font-extrabold">{stats.uniqueStudents}</p>
            </div>
            <div className="metric-card">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempts</p>
              <p className="mt-1 text-2xl font-extrabold">{stats.totalAttempts}</p>
            </div>
            <div className="metric-card">
              <Medal className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Average</p>
              <p className="mt-1 text-2xl font-extrabold">{stats.avg}%</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleShare}
            className="btn-primary mt-6 h-12 w-full sm:w-auto"
          >
            <Share2 className="h-4 w-4" />
            Share this leaderboard
          </Button>
        </section>

        <section className="surface-panel mt-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Rankings</p>
              <h2 className="mt-1 text-2xl font-extrabold">Best score per student</h2>
            </div>
          </div>

          {leaders.length === 0 ? (
            <div className="mt-6 rounded-[22px] border border-dashed border-border/70 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No attempts recorded for this day yet. Share a quiz with your students to populate
                the leaderboard.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {leaders.map((entry, index) => {
                const isTop = index < 3;
                const accent =
                  index === 0
                    ? "bg-warning/15 text-warning"
                    : index === 1
                      ? "bg-primary/10 text-primary"
                      : index === 2
                        ? "bg-success/15 text-success"
                        : "bg-secondary text-muted-foreground";
                return (
                  <div
                    key={entry.name}
                    className="flex items-center gap-4 rounded-[22px] border border-border/70 bg-card/85 p-4"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold ${accent}`}
                    >
                      {isTop ? <Medal className="h-5 w-5" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-foreground">{entry.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.attempts} attempt{entry.attempts === 1 ? "" : "s"}
                        {entry.sessionName ? ` • ${entry.sessionName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-foreground">
                        {Math.round(entry.bestPct)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.bestScore}/{entry.bestTotal}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DailyLeaderboard;
