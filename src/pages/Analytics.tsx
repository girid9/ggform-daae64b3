import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Loader2,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AnalyticsSkeleton } from "@/components/PageSkeletons";

interface AttemptRow {
  id: string;
  student_name: string;
  score: number;
  total_questions: number;
  created_at: string;
  answers: Record<string, string>;
}

interface QuestionRow {
  id: string;
  question: string;
  correct_answer: string;
  topic: string;
}

const Analytics = () => {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: attemptRows }, { data: questionRows }] = await Promise.all([
        supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_questions").select("id, question, correct_answer, topic"),
      ]);

      if (attemptRows) {
        setAttempts(attemptRows as AttemptRow[]);
      }

      if (questionRows) {
        setQuestions(questionRows);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const stats = useMemo(() => {
    const totalStudents = new Set(attempts.map((attempt) => attempt.student_name.toLowerCase())).size;
    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce(
              (sum, attempt) => sum + (attempt.score / attempt.total_questions) * 100,
              0,
            ) / totalAttempts,
          )
        : 0;
    const passRate =
      totalAttempts > 0
        ? Math.round(
            (attempts.filter((attempt) => (attempt.score / attempt.total_questions) * 100 >= 60)
              .length /
              totalAttempts) *
              100,
          )
        : 0;

    return { totalStudents, totalAttempts, avgScore, passRate };
  }, [attempts]);

  const topicBreakdown = useMemo(() => {
    const topicStats: Record<string, { total: number; correct: number }> = {};

    attempts.forEach((attempt) => {
      Object.entries(attempt.answers).forEach(([questionId, answer]) => {
        const question = questions.find((item) => item.id === questionId);
        if (!question) {
          return;
        }

        if (!topicStats[question.topic]) {
          topicStats[question.topic] = { total: 0, correct: 0 };
        }

        topicStats[question.topic].total += 1;
        if (answer === question.correct_answer) {
          topicStats[question.topic].correct += 1;
        }
      });
    });

    return Object.entries(topicStats)
      .map(([topic, stat]) => ({
        topic,
        accuracy: Math.round((stat.correct / stat.total) * 100),
        total: stat.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [attempts, questions]);

  const hardestQuestions = useMemo(() => {
    const questionStats: Record<string, { total: number; correct: number }> = {};

    attempts.forEach((attempt) => {
      Object.entries(attempt.answers).forEach(([questionId, answer]) => {
        if (!questionStats[questionId]) {
          questionStats[questionId] = { total: 0, correct: 0 };
        }

        questionStats[questionId].total += 1;
        const question = questions.find((item) => item.id === questionId);
        if (question && answer === question.correct_answer) {
          questionStats[questionId].correct += 1;
        }
      });
    });

    return Object.entries(questionStats)
      .map(([questionId, stat]) => ({
        question: questions.find((item) => item.id === questionId),
        accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
        totalAttempts: stat.total,
      }))
      .filter((item) => item.question && item.totalAttempts >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);
  }, [attempts, questions]);

  const dailyBreakdown = useMemo(() => {
    const grouped: Record<string, { attempts: number; totalPct: number }> = {};

    attempts.forEach((attempt) => {
      const day = new Date(attempt.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      if (!grouped[day]) {
        grouped[day] = { attempts: 0, totalPct: 0 };
      }

      grouped[day].attempts += 1;
      grouped[day].totalPct += (attempt.score / attempt.total_questions) * 100;
    });

    return Object.entries(grouped)
      .map(([date, stat]) => ({
        date,
        attempts: stat.attempts,
        avgScore: Math.round(stat.totalPct / stat.attempts),
      }))
      .slice(0, 12);
  }, [attempts]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="page-bg min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
              Back to console
            </Link>
          </Button>
          <DarkModeToggle />
        </div>

        <section className="hero-shell mt-5 p-6 sm:p-8">
          <span className="chip-primary">Analytics</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-[3.15rem]">
            See where learners are thriving and where the content needs help.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            This view turns raw attempts into patterns: participation, score quality, difficult
            topics, and the questions that are dragging performance down.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Users, label: "Students", value: stats.totalStudents },
              { icon: BarChart3, label: "Attempts", value: stats.totalAttempts },
              { icon: TrendingUp, label: "Average", value: `${stats.avgScore}%` },
              { icon: Trophy, label: "Pass rate", value: `${stats.passRate}%` },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="metric-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        {stats.totalAttempts === 0 ? (
          <Card className="surface-panel mt-5 border-0">
            <CardContent className="py-16 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/35" />
              <h2 className="mt-5 text-2xl font-extrabold">No analytics yet</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Results will appear here after students submit quizzes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <section className="surface-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="eyebrow">Trend</p>
                    <h2 className="mt-1 text-2xl font-extrabold">Daily performance breakdown</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {dailyBreakdown.map((entry) => (
                    <div key={entry.date}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">{entry.date}</span>
                        <span className="text-muted-foreground">
                          {entry.avgScore}% average across {entry.attempts} attempt
                          {entry.attempts === 1 ? "" : "s"}
                        </span>
                      </div>
                      <Progress value={entry.avgScore} className="mt-2 h-2.5" />
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="eyebrow">Topics</p>
                    <h2 className="mt-1 text-2xl font-extrabold">Accuracy by topic</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {topicBreakdown.map((topic) => (
                    <div key={topic.topic} className="rounded-[22px] border border-border/70 bg-card/85 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{topic.topic}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{topic.total} answers recorded</p>
                        </div>
                        <span
                          className={`text-2xl font-extrabold ${
                            topic.accuracy >= 60 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {topic.accuracy}%
                        </span>
                      </div>
                      <Progress value={topic.accuracy} className="mt-3 h-2.5" />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="surface-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-warning/15 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="eyebrow">Question audit</p>
                  <h2 className="mt-1 text-2xl font-extrabold">Most difficult questions</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {hardestQuestions.map((item, index) => (
                  <div
                    key={item.question?.id}
                    className="rounded-[22px] border border-border/70 bg-card/85 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          item.accuracy < 40
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-6 text-foreground">
                          {item.question?.question}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.question?.topic} • {item.totalAttempts} attempts • {item.accuracy}%
                          correct
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
