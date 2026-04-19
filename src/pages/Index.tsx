import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Cpu,
  GraduationCap,
  Loader2,
  LogOut,
  Medal,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { FloatingInput } from "@/components/FloatingInput";
import { useGsapScene } from "@/hooks/useGsapScene";


const NAME_KEY = "student-name";

interface TopicScore {
  student_name: string;
  subject_id: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
}

interface QuizSession {
  id: string;
  session_code: string;
  created_at: string;
  question_ids: string[];
  name: string;
}

interface QuizAttempt {
  id: string;
  student_name: string;
  score: number;
  total_questions: number;
  created_at: string;
  session_id: string;
}

interface LeaderEntry {
  student_name: string;
  total_score: number;
  total_questions: number;
  quiz_count: number;
  avg_pct: number;
}

type LeaderAttempt = Pick<QuizAttempt, "student_name" | "score" | "total_questions">;

const buildLeaderboard = (attempts: LeaderAttempt[]): LeaderEntry[] => {
  const totals = new Map<string, LeaderEntry>();

  attempts.forEach((attempt) => {
    const key = attempt.student_name.trim().toLowerCase();
    const existing = totals.get(key);

    if (existing) {
      existing.total_score += attempt.score;
      existing.total_questions += attempt.total_questions;
      existing.quiz_count += 1;
      existing.avg_pct = existing.total_questions > 0
        ? Math.round((existing.total_score / existing.total_questions) * 100)
        : 0;
      return;
    }

    totals.set(key, {
      student_name: attempt.student_name,
      total_score: attempt.score,
      total_questions: attempt.total_questions,
      quiz_count: 1,
      avg_pct: attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
    });
  });

  return Array.from(totals.values()).sort(
    (a, b) => b.avg_pct - a.avg_pct || b.total_score - a.total_score || a.student_name.localeCompare(b.student_name),
  );
};

const SUBJECT_META = [
  { id: "ictsm", name: "ICTSM", color: "#2563EB", icon: Cpu },
  { id: "es", name: "ES", color: "#0F9D74", icon: Briefcase },
];

const Index = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [nameInput, setNameInput] = useState("");
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [myAttempts, setMyAttempts] = useState<QuizAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [allTopicCounts, setAllTopicCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");



  const isLoggedIn = name.trim().length > 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [sessRes, attRes, scoreRes, qRes, leaderRes] = await Promise.allSettled([
        supabase.from("quiz_sessions").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_attempts").select("*").ilike("student_name", name),
        supabase.from("topic_scores").select("*").ilike("student_name", name),
        supabase.from("quiz_questions").select("subject_id, topic"),
        supabase.from("quiz_attempts").select("student_name, score, total_questions").limit(1000),
      ]);

      if (sessRes.status === "fulfilled" && sessRes.value.data) {
        setSessions(sessRes.value.data);
      } else if (sessRes.status === "rejected") {
        setLoadError("Some dashboard data could not be loaded.");
      }

      if (attRes.status === "fulfilled" && attRes.value.data) {
        const attempts = attRes.value.data as QuizAttempt[];
        setMyAttempts(attempts);
      } else if (attRes.status === "rejected") {
        setMyAttempts([]);
        setLoadError("Some dashboard data could not be loaded.");
      }

      if (leaderRes.status === "fulfilled" && leaderRes.value.data) {
        setLeaderboard(buildLeaderboard(leaderRes.value.data as LeaderAttempt[]));
      } else if (leaderRes.status === "rejected") {
        setLeaderboard([]);
      }

      if (scoreRes.status === "fulfilled" && scoreRes.value.data) {
        setTopicScores(scoreRes.value.data as TopicScore[]);
      } else if (scoreRes.status === "rejected") {
        setTopicScores([]);
        setLoadError("Some dashboard data could not be loaded.");
      }

      if (qRes.status === "fulfilled" && qRes.value.data) {
        const sets: Record<string, Set<string>> = {};
        (qRes.value.data as { subject_id: string; topic: string }[]).forEach((question) => {
          if (!question.subject_id) {
            return;
          }

          sets[question.subject_id] = sets[question.subject_id] || new Set();
          sets[question.subject_id].add(question.topic);
        });

        const counts: Record<string, number> = {};
        Object.entries(sets).forEach(([subjectId, topics]) => {
          counts[subjectId] = topics.size;
        });
        setAllTopicCounts(counts);
      } else if (qRes.status === "rejected") {
        setAllTopicCounts({});
        setLoadError("Some dashboard data could not be loaded.");
      }
    } catch {
      setLoadError("The dashboard could not be loaded right now.");
      setSessions([]);
      setLeaderboard([]);
      setMyAttempts([]);
      setTopicScores([]);
      setAllTopicCounts({});
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    if (isLoggedIn) {
      void fetchData();
    }
  }, [fetchData, isLoggedIn]);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameInput.trim()) {
      return;
    }

    const trimmed = nameInput.trim();
    localStorage.setItem(NAME_KEY, trimmed);
    setName(trimmed);
  };

  const handleLogout = () => {
    localStorage.removeItem(NAME_KEY);
    setName("");
    setNameInput("");
    setLoadError("");
  };

  const myTopicScores = useMemo(
    () => topicScores.filter((score) => score.student_name.toLowerCase() === name.toLowerCase()),
    [name, topicScores],
  );

  const myBestByTopic = useMemo(() => {
    const map = new Map<string, TopicScore>();

    myTopicScores.forEach((score) => {
      const key = `${score.subject_id}|${score.topic}`;
      const previous = map.get(key);
      if (!previous || score.percentage > previous.percentage) {
        map.set(key, score);
      }
    });

    return Array.from(map.values());
  }, [myTopicScores]);

  const masteredCount = myBestByTopic.filter((score) => score.percentage >= 80).length;
  const totalUniqueTopics = Object.values(allTopicCounts).reduce((total, count) => total + count, 0);
  const overallProgress = totalUniqueTopics > 0
    ? Math.round((myBestByTopic.length / totalUniqueTopics) * 100)
    : 0;
  const studyAvg = myBestByTopic.length > 0
    ? Math.round(
        myBestByTopic.reduce((total, item) => total + item.percentage, 0) / myBestByTopic.length,
      )
    : 0;

  const myStats = useMemo(() => {
    if (myAttempts.length === 0) {
      return { quizzes: 0, avgPct: 0, bestPct: 0, totalScore: 0 };
    }

    const percentages = myAttempts.map((attempt) =>
      Math.round((attempt.score / attempt.total_questions) * 100),
    );

    return {
      quizzes: myAttempts.length,
      avgPct: Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length),
      bestPct: Math.max(...percentages),
      totalScore: myAttempts.reduce((total, attempt) => total + attempt.score, 0),
    };
  }, [myAttempts]);

  const subjectStats = useMemo(
    () =>
      SUBJECT_META.map((subject) => {
        const coveredTopics = myBestByTopic.filter((topic) => topic.subject_id === subject.id);
        const total = allTopicCounts[subject.id] || 0;
        const average = coveredTopics.length > 0
          ? Math.round(
              coveredTopics.reduce((sum, item) => sum + item.percentage, 0) / coveredTopics.length,
            )
          : 0;

        return {
          ...subject,
          attempted: coveredTopics.length,
          total,
          avg: average,
          progress: total > 0 ? Math.round((coveredTopics.length / total) * 100) : 0,
        };
      }),
    [allTopicCounts, myBestByTopic],
  );

  // Leaderboard is now fetched from the database view
  const featuredSession = sessions[0];
  const pendingSessions = sessions.filter(
    (session) => !myAttempts.some((attempt) => attempt.session_id === session.id),
  ).length;
  const myRank =
    leaderboard.findIndex((entry) => entry.student_name.toLowerCase() === name.toLowerCase()) + 1;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  })();

  useGsapScene(
    dashboardRef,
    [isLoggedIn, sessions.length, overallProgress, leaderboard.length],
    {
      progressSelector: "[data-progress-orb]",
      progressValue: overallProgress,
    },
  );

  /* ─────────────── LOGIN SCREEN ─────────────── */
  if (!isLoggedIn) {
    return (
      <div ref={dashboardRef} className="page-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md" data-hero>
          <div className="surface-panel p-7 sm:p-9">
            {/* Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-foreground">GGForm</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Quiz Hub</p>
                </div>
              </div>
              <DarkModeToggle />
            </div>

            {/* Heading */}
            <div className="mt-7">
              <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                Ready to learn?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your name to access quizzes, track progress & compete.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-3">
              <FloatingInput
                id="student-name"
                label="Your name"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                autoFocus
                className="h-13 rounded-2xl bg-background/80"
              />
              <Button
                type="submit"
                className="btn-primary h-13 w-full text-sm"
                disabled={!nameInput.trim()}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Features strip */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Target, label: "Practice" },
                { icon: Trophy, label: "Compete" },
                { icon: BookOpen, label: "Study" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-secondary/50 p-3"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tutor link */}
            <div className="mt-5 flex justify-center">
              <Button asChild variant="ghost" className="h-9 rounded-xl px-3 text-xs text-muted-foreground">
                <Link to="/admin">
                  <Shield className="h-3.5 w-3.5" />
                  Tutor console
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── DASHBOARD ─────────────── */
  return (
    <div ref={dashboardRef} className="page-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
            {loadError}
          </div>
        )}

        {/* ── Compact Header ── */}
        <header
          className="surface-panel flex items-center justify-between gap-3 px-5 py-4"
          data-hero
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{greeting}</p>
              <h1 className="text-xl font-extrabold sm:text-2xl">{name.split(" ")[0]}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl" onClick={handleLogout} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── Quick Stats Row ── */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-reveal>
          {[
            { label: "Best", value: `${myStats.bestPct}%`, icon: Trophy },
            { label: "Average", value: `${myStats.avgPct}%`, icon: TrendingUp },
            { label: "Mastered", value: `${masteredCount}`, icon: Sparkles },
            { label: "Coverage", value: `${overallProgress}%`, icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="surface-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                <p className="text-xl font-extrabold">{value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Main Grid ── */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_340px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Next action + Progress orb */}
            <section className="hero-shell p-5 sm:p-6" data-stagger>
              <div className="dashboard-grid absolute inset-0 opacity-20" />
              <div className="relative grid gap-5 lg:grid-cols-[1fr_200px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2" data-hero>
                    <Badge variant="secondary" className="chip-primary border-0">
                      {pendingSessions > 0 ? `${pendingSessions} quizzes waiting` : "All caught up"}
                    </Badge>
                    <span className="pill">{myStats.quizzes} attempts</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl" data-hero>
                    {featuredSession ? "A quiz is live" : "Keep your streak going"}
                  </h2>

                  {featuredSession && (
                    <div className="mt-3 rounded-2xl border border-border bg-background/80 p-3" data-stagger-item>
                      <p className="text-sm font-bold">{featuredSession.name || featuredSession.session_code}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {featuredSession.question_ids.length} Qs · {new Date(featuredSession.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="btn-primary h-11 px-5 text-sm">
                      <Link to={featuredSession ? `/quiz/${featuredSession.session_code}` : "/study"}>
                        {featuredSession ? "Start quiz" : "Study now"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild className="btn-secondary h-11 px-4 text-sm">
                      <Link to="/study">Study mode</Link>
                    </Button>
                  </div>
                </div>

                {/* Progress Orb */}
                <div className="hidden place-items-center lg:grid" data-hero>
                  <div className="progress-orb h-40 w-40" data-progress-orb>
                    <div className="relative z-10 text-center">
                      <p className="text-4xl font-extrabold">{overallProgress}%</p>
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        coverage
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Live Quizzes */}
            <section className="surface-panel p-5" data-reveal>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Live Quizzes</h2>
                <span className="pill">{sessions.length}</span>
              </div>

              <div className="mt-4 space-y-2 stagger">
                {sessions.length > 0 ? (
                  sessions.slice(0, 4).map((session, index) => {
                    const myAttempt = myAttempts.find((attempt) => attempt.session_id === session.id);
                    const percentage = myAttempt
                      ? Math.round((myAttempt.score / myAttempt.total_questions) * 100)
                      : null;

                    return (
                      <Link
                        key={session.id}
                        to={`/quiz/${session.session_code}`}
                        className="interactive-card flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-3 hover:border-primary/35"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-bold">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{session.name || session.session_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.question_ids.length} Qs · {new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        {percentage !== null ? (
                          <p className="text-lg font-extrabold">{percentage}%</p>
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/50 p-4 text-center">
                    <p className="text-xs font-semibold text-muted-foreground">No live quizzes yet</p>
                  </div>
                )}
              </div>
            </section>

            {/* Leaderboard */}
            <section className="surface-panel p-5" data-reveal>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Leaderboard</h2>
                {myRank > 0 && <span className="pill">You #{myRank}</span>}
              </div>

              {leaderboard.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background/80 stagger">
                  {leaderboard.slice(0, 8).map((entry, index) => {
                    const isMe = entry.student_name.toLowerCase() === name.toLowerCase();

                    return (
                      <div
                        key={entry.student_name}
                        className={`flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 transition-colors duration-150 hover:bg-secondary/40 ${
                          isMe ? "bg-primary/8" : ""
                        }`}
                      >
                        <div className="flex w-8 justify-center">
                          {index < 3 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Medal className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${isMe ? "font-bold" : "font-medium"}`}>
                            {entry.student_name}{isMe ? " (You)" : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {entry.quiz_count} quiz{entry.quiz_count === 1 ? "" : "zes"}
                          </p>
                        </div>
                        <p className="text-lg font-extrabold">{entry.avg_pct}%</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/50 p-4 text-center">
                  <Trophy className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">No scores yet</p>
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Rank + Score cards */}
            <section className="surface-panel p-5" data-hero>
              <div className="grid grid-cols-2 gap-3">
                <div className="metric-card text-center">
                  <p className="eyebrow">Rank</p>
                  <p className="mt-2 text-3xl font-extrabold">{myRank > 0 ? `#${myRank}` : "-"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    of {leaderboard.length || "—"}
                  </p>
                </div>
                <div className="metric-card text-center">
                  <p className="eyebrow">Score</p>
                  <p className="mt-2 text-3xl font-extrabold">{myStats.totalScore}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {myStats.quizzes} quiz{myStats.quizzes === 1 ? "" : "zes"}
                  </p>
                </div>
              </div>
            </section>

            {/* Subject Progress */}
            <section className="surface-panel p-5" data-reveal>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Subjects</h2>
                <Button asChild variant="ghost" className="h-8 rounded-xl px-3 text-xs text-primary">
                  <Link to="/study">Study →</Link>
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {subjectStats.map((subject) => {
                  const Icon = subject.icon;

                  return (
                    <Link
                      key={subject.id}
                      to="/study"
                      className="block rounded-2xl border border-border bg-background/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">{subject.name}</p>
                            <p className="text-lg font-extrabold" style={{ color: subject.color }}>
                              {subject.progress}%
                            </p>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {subject.attempted}/{subject.total} topics{subject.attempted > 0 ? ` · ${subject.avg}% avg` : ""}
                          </p>
                          <div className="progress-track mt-2">
                            <div
                              className="progress-fill"
                              style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Study CTA */}
            <section className="hero-shell p-5" data-reveal>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Keep studying</p>
                  <p className="text-[10px] text-muted-foreground">Build topic confidence</p>
                </div>
                <Button asChild size="sm" className="btn-primary h-9 rounded-xl px-4 text-xs">
                  <Link to="/study">
                    Go <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* Tutor link */}
            <div className="flex justify-center pb-2">
              <Button asChild variant="ghost" className="h-9 rounded-xl text-xs text-muted-foreground">
                <Link to="/admin">
                  <Shield className="h-3.5 w-3.5" />
                  Tutor console
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
};

export default Index;
