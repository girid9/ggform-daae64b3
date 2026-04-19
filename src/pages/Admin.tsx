import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  Copy,
  Eye,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionCode } from "@/lib/shuffle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { EmptyState } from "@/components/EmptyState";
import Leaderboard from "@/components/Leaderboard";
import StudentDetail from "@/components/StudentDetail";

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
  answers: Record<string, string>;
}

interface VerifyAdminResponse {
  ok: boolean;
  error?: string;
}

interface PreviewQuestion {
  id: string;
  question: string;
  topic: string;
}

const getTopicSelectionKey = (topics: string[]) =>
  [...topics]
    .map((topic) => topic.trim())
    .sort((a, b) => a.localeCompare(b))
    .join("||");

const formatDate = (value: string, withTime = false) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: withTime ? "numeric" : undefined,
  });

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<QuizAttempt | null>(null);
  const [creating, setCreating] = useState(false);
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSelectionKey, setPreviewSelectionKey] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    void fetchSessions();
    void fetchTopics();
  }, [authenticated]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    void fetchAttempts(selectedSession.id);
  }, [selectedSession]);

  useEffect(() => {
    if (!showPreview) {
      return;
    }

    setShowPreview(false);
    setPreviewQuestions([]);
    setPreviewSelectionKey("");
  }, [selectedTopics, showPreview]);

  const fetchTopics = async () => {
    const { data } = await supabase.from("quiz_questions").select("topic");
    if (!data) {
      return;
    }

    const map = new Map<string, number>();
    data.forEach((question) => {
      map.set(question.topic, (map.get(question.topic) || 0) + 1);
    });

    setTopics(
      Array.from(map.entries())
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => a.topic.localeCompare(b.topic)),
    );
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("quiz_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setSessions(data);
    }
  };

  const fetchAttempts = async (sessionId: string) => {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (data) {
      setAttempts(data as QuizAttempt[]);
    }
  };

  const generatePreview = async () => {
    let query = supabase.from("quiz_questions").select("id, question, topic");
    if (selectedTopics.length > 0) {
      query = query.in("topic", selectedTopics);
    }

    const { data: questions } = await query;
    if (!questions || questions.length === 0) {
      toast.error("No questions found for the selected topics.");
      return;
    }

    setPreviewQuestions([...questions].sort((a, b) => a.topic.localeCompare(b.topic)));
    setPreviewSelectionKey(getTopicSelectionKey(selectedTopics));
    setShowPreview(true);
  };

  const swapQuestion = async (index: number) => {
    const currentIds = new Set(previewQuestions.map((question) => question.id));
    const currentQuestion = previewQuestions[index];
    const { data: all } = await supabase
      .from("quiz_questions")
      .select("id, question, topic")
      .eq("topic", currentQuestion.topic);

    if (!all) {
      return;
    }

    const available = all.filter((question) => !currentIds.has(question.id));
    if (available.length === 0) {
      toast.error("There are no more spare questions in this topic.");
      return;
    }

    const replacement = available[Math.floor(Math.random() * available.length)];
    setPreviewQuestions((prev) =>
      prev.map((question, questionIndex) => (questionIndex === index ? replacement : question)),
    );
    toast.success("Question swapped.");
  };

  const getQuizName = () => {
    if (selectedTopics.length === 0) {
      return "All Topics";
    }

    if (selectedTopics.length === 1) {
      return selectedTopics[0];
    }

    return `${selectedTopics.length} Topic Mix`;
  };

  const splitAndInsert = async (allIds: string[], baseName: string) => {
    const chunkSize = 30;

    if (allIds.length <= chunkSize) {
      const code = generateSessionCode();
      const { error } = await supabase.from("quiz_sessions").insert({
        session_code: code,
        question_ids: allIds,
        name: baseName,
      });

      if (error) {
        toast.error("Failed to create quiz.");
        console.error(error);
        return;
      }

      toast.success(`Published "${baseName}" with ${allIds.length} questions.`);
    } else {
      const parts: string[][] = [];
      for (let index = 0; index < allIds.length; index += chunkSize) {
        parts.push(allIds.slice(index, index + chunkSize));
      }

      for (let index = 0; index < parts.length; index += 1) {
        const code = generateSessionCode();
        const partName = `${baseName} - Part ${index + 1}`;
        const { error } = await supabase.from("quiz_sessions").insert({
          session_code: code,
          question_ids: parts[index],
          name: partName,
        });

        if (error) {
          toast.error(`Failed to publish ${partName}.`);
          console.error(error);
          return;
        }
      }

      toast.success(`Published ${parts.length} quiz parts.`);
    }

    await fetchSessions();
  };

  const publishQuiz = async () => {
    if (previewQuestions.length === 0) {
      return;
    }

    const currentSelectionKey = getTopicSelectionKey(selectedTopics);
    if (previewSelectionKey !== currentSelectionKey) {
      toast.error("Topic selection changed. Preview again before publishing.");
      setShowPreview(false);
      setPreviewQuestions([]);
      setPreviewSelectionKey("");
      return;
    }

    setCreating(true);
    try {
      await splitAndInsert(
        previewQuestions.map((question) => question.id),
        getQuizName(),
      );
      setShowPreview(false);
      setPreviewQuestions([]);
      setPreviewSelectionKey("");
    } finally {
      setCreating(false);
    }
  };

  const createQuizDirect = async () => {
    setCreating(true);
    try {
      let query = supabase.from("quiz_questions").select("id, topic");
      if (selectedTopics.length > 0) {
        query = query.in("topic", selectedTopics);
      }

      const { data: questions } = await query;
      if (!questions || questions.length === 0) {
        toast.error("No questions found.");
        return;
      }

      const sorted = [...questions].sort((a, b) => a.topic.localeCompare(b.topic));
      await splitAndInsert(
        sorted.map((question) => question.id),
        getQuizName(),
      );
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (code: string) => {
    const url = `${window.location.origin}/quiz/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Quiz link copied.");
  };

  const deleteAttempt = async (attemptId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm("Delete this student's attempt?")) {
      return;
    }

    const { error } = await supabase.from("quiz_attempts").delete().eq("id", attemptId);

    if (error) {
      toast.error("Failed to delete attempt.");
      return;
    }

    toast.success("Attempt deleted.");
    setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
  };

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm("Delete this quiz and all its responses?")) {
      return;
    }

    await supabase.from("quiz_attempts").delete().eq("session_id", sessionId);
    const { error } = await supabase.from("quiz_sessions").delete().eq("id", sessionId);

    if (error) {
      toast.error("Failed to delete quiz.");
      return;
    }

    toast.success("Quiz deleted.");
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const clearAllRecords = async () => {
    if (!window.confirm("This will remove all quizzes and student responses. Continue?")) {
      return;
    }

    if (!window.confirm("This cannot be undone. Do you want a full reset?")) {
      return;
    }

    await supabase
      .from("quiz_attempts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("quiz_sessions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("daily_topics")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    setSessions([]);
    setAttempts([]);
    setSelectedSession(null);
    toast.success("All records cleared.");
  };

  const exportToCSV = () => {
    if (attempts.length === 0) {
      toast.error("There is no data to export.");
      return;
    }

    const headers = ["Student Name", "Score", "Total Questions", "Percentage", "Date"];
    const rows = attempts.map((attempt) => [
      attempt.student_name,
      attempt.score,
      attempt.total_questions,
      `${Math.round((attempt.score / attempt.total_questions) * 100)}%`,
      new Date(attempt.created_at).toLocaleString(),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-results-${selectedSession?.session_code || "all"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported.");
  };

  const regenerateQuiz = async () => {
    if (!selectedSession) {
      return;
    }

    setCreating(true);
    try {
      const size = selectedSession.question_ids.length;
      const { data: questions } = await supabase.from("quiz_questions").select("id");
      if (!questions || questions.length < size) {
        toast.error("Not enough questions to regenerate this quiz.");
        return;
      }

      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const newIds = shuffled.slice(0, size).map((question) => question.id);
      const { error } = await supabase
        .from("quiz_sessions")
        .update({ question_ids: newIds })
        .eq("id", selectedSession.id);

      if (error) {
        toast.error("Failed to regenerate quiz.");
        console.error(error);
        return;
      }

      setSelectedSession({ ...selectedSession, question_ids: newIds });
      toast.success("Quiz regenerated with fresh questions.");
      await fetchSessions();
    } finally {
      setCreating(false);
    }
  };

  const handlePasscode = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passcode === "3510") {
      setAuthenticated(true);
      toast.success("Access granted.");
    } else {
      toast.error("Incorrect passcode.");
    }
  };

  const totalQuestionPool = useMemo(
    () => topics.reduce((sum, topic) => sum + topic.count, 0),
    [topics],
  );

  const sessionAttemptsCount = useMemo(
    () => attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0),
    [attempts],
  );

  const sessionAverage = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    return Math.round(
      attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions) * 100, 0) /
        attempts.length,
    );
  }, [attempts]);

  const recentActivity = sessions.slice(0, 5);

  if (!authenticated) {
    return (
      <div className="page-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="surface-panel p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold">Tutor Console</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">GGForm Admin</p>
                </div>
              </div>
              <DarkModeToggle />
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-extrabold">Enter passcode</h1>
              <p className="mt-1 text-sm text-muted-foreground">Unlock quiz publishing & student management.</p>
            </div>

            <form onSubmit={handlePasscode} className="mt-5 space-y-3">
              <input
                type="password"
                placeholder="••••••"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                className="h-13 w-full rounded-2xl border border-border/70 bg-card/80 px-5 text-center text-base font-semibold tracking-[0.28em] text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                autoFocus
              />
              <Button type="submit" className="btn-primary h-13 w-full text-sm">
                Open console
              </Button>
            </form>

            <div className="mt-4 flex justify-center">
              <Button asChild variant="ghost" className="h-9 rounded-xl px-3 text-xs text-muted-foreground">
                <Link to="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedStudent && selectedSession) {
    return (
      <StudentDetail
        attempt={selectedStudent}
        questionIds={selectedSession.question_ids}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  if (selectedSession) {
    return (
      <div className="page-bg min-h-screen px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSession(null);
                setAttempts([]);
              }}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to console
            </Button>
            <DarkModeToggle />
          </div>

          <section className="hero-shell mt-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="chip-primary">Session detail</span>
                <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                  {selectedSession.name || selectedSession.session_code}
                </h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(selectedSession.created_at, true)} · {selectedSession.question_ids.length} questions
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="btn-secondary h-11 px-4 text-sm"
                  onClick={regenerateQuiz}
                  disabled={creating}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Regenerate
                </Button>
                <Button variant="outline" className="btn-secondary h-11 px-4 text-sm" onClick={exportToCSV}>
                  <BarChart3 className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  className="btn-secondary h-11 px-4 text-sm"
                  onClick={() => void copyLink(selectedSession.session_code)}
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="metric-card">
                <p className="eyebrow">Responses</p>
                <p className="mt-3 text-3xl font-extrabold">{attempts.length}</p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Average score</p>
                <p className="mt-3 text-3xl font-extrabold">{sessionAverage}%</p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Questions answered</p>
                <p className="mt-3 text-3xl font-extrabold">{sessionAttemptsCount}</p>
              </div>
            </div>
          </section>

          <div className="mt-5">
            <Leaderboard sessionId={selectedSession.id} />
          </div>

          <section className="surface-panel mt-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Student Attempts</h2>
              <span className="pill">{attempts.length}</span>
            </div>

            {attempts.length === 0 ? (
              <EmptyState
                icon="students"
                title="No responses yet"
                description="Share the quiz link with students and their submissions will appear here."
              />
            ) : (
              <div className="mt-5 space-y-3">
                {attempts.map((attempt) => {
                  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => setSelectedStudent(attempt)}
                      className="card-interactive flex w-full items-center gap-4 rounded-[24px] border border-border/70 bg-card/85 p-4 text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/10 text-sm font-bold text-primary">
                        {attempt.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{attempt.student_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(attempt.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-foreground">{percentage}%</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.score}/{attempt.total_questions}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80">
                          <Eye className="h-4 w-4" />
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => deleteAttempt(attempt.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="btn-secondary h-11 px-4 text-sm">
              <Link to="/analytics">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <DarkModeToggle />
          </div>
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="hero-shell p-5 sm:p-6">
            <span className="chip-primary">Tutor workspace</span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">
              Publish & manage quizzes
            </h1>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="metric-card">
                <p className="eyebrow">Sessions</p>
                <p className="mt-2 text-2xl font-extrabold">{sessions.length}</p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Topics</p>
                <p className="mt-2 text-2xl font-extrabold">{topics.length}</p>
              </div>
              <div className="metric-card">
                <p className="eyebrow">Questions</p>
                <p className="mt-2 text-2xl font-extrabold">{totalQuestionPool}</p>
              </div>
            </div>
          </div>

          <aside className="surface-panel p-5">
            <h2 className="text-lg font-extrabold">Quick Links</h2>
            <div className="mt-5 grid gap-3">
              <Button asChild className="btn-secondary h-12 justify-start px-4 text-sm">
                <Link to="/questions">
                  <BookOpen className="h-4 w-4" />
                  Open question bank
                </Link>
              </Button>
              <Button asChild className="btn-secondary h-12 justify-start px-4 text-sm">
                <Link to="/import">
                  <Upload className="h-4 w-4" />
                  Import questions
                </Link>
              </Button>
              <Button asChild className="btn-secondary h-12 justify-start px-4 text-sm">
                <Link to="/study">
                  <GraduationCap className="h-4 w-4" />
                  View study mode
                </Link>
              </Button>
            </div>

            <div className="mt-6 rounded-[24px] border border-border/70 bg-secondary/55 p-4">
              <p className="text-sm font-semibold text-foreground">Recent activity</p>
              <div className="mt-3 space-y-2">
                {recentActivity.length > 0 ? (
                  recentActivity.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="flex w-full items-center justify-between rounded-[18px] bg-card/80 px-3 py-3 text-left transition-colors hover:bg-card"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {session.name || session.session_code}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {session.question_ids.length} questions
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(session.created_at)}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    New sessions will appear here as soon as you publish them.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)]">
          <section className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Create Quiz</h2>
              <span className="pill">
                {selectedTopics.length === 0 ? "All topics" : `${selectedTopics.length} selected`}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {topics.map((topic) => {
                const isSelected = selectedTopics.includes(topic.topic);
                return (
                  <button
                    key={topic.topic}
                    type="button"
                    onClick={() =>
                      setSelectedTopics((prev) =>
                        isSelected ? prev.filter((item) => item !== topic.topic) : [...prev, topic.topic],
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_28px_-20px_hsl(var(--primary)/0.8)]"
                        : "border-border/70 bg-card/85 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {topic.topic} ({topic.count})
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {selectedTopics.length === 0
                ? `Full bank: ${totalQuestionPool} Qs, ${topics.length} topics`
                : `${selectedTopics.length} topics · ${
                    topics
                      .filter((topic) => selectedTopics.includes(topic.topic))
                      .reduce((sum, topic) => sum + topic.count, 0)
                  } Qs`}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={generatePreview} disabled={creating} className="btn-primary h-12 flex-1 text-sm">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview before publish
              </Button>
              <Button onClick={createQuizDirect} disabled={creating} className="btn-secondary h-12 flex-1 text-sm">
                <Plus className="h-4 w-4" />
                Publish instantly
              </Button>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Reset Workspace</h2>
              <span className="pill">Danger</span>
            </div>

            <Button
              variant="outline"
              className="mt-6 h-12 w-full rounded-2xl border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={clearAllRecords}
            >
              <Trash2 className="h-4 w-4" />
              Clear all records
            </Button>
          </section>
        </div>

        {showPreview && previewQuestions.length > 0 ? (
          <section className="surface-panel mt-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Preview</p>
                <h2 className="mt-2 text-2xl font-extrabold">
                  {previewQuestions.length} questions ready to publish
                </h2>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-11 rounded-2xl text-sm" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button className="btn-primary h-11 px-5 text-sm" onClick={publishQuiz} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Publish quiz
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {previewQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-start gap-4 rounded-[24px] border border-border/70 bg-card/85 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-sm font-bold text-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-6 text-foreground">{question.question}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {question.topic}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-10 rounded-2xl px-3 text-xs"
                    onClick={() => void swapQuestion(index)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Swap
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="surface-panel mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Published Quizzes</h2>
            <span className="pill">{sessions.length}</span>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="No quizzes published yet"
              description="Create your first quiz from the topic selector above and it will appear here."
              actionLabel="Publish now"
              onAction={() => void createQuizDirect()}
            />
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="card-interactive cursor-pointer overflow-hidden rounded-[28px] border border-border/70 bg-card/90"
                  onClick={() => setSelectedSession(session)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-foreground">
                          {session.name || session.session_code}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(session.created_at, true)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-2xl"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyLink(session.session_code);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-2xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => void deleteSession(session.id, event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="pill">{session.question_ids.length} questions</span>
                      <span className="pill font-mono">{session.session_code}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;
