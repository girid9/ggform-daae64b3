import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { shuffleArray } from "@/lib/shuffle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import Leaderboard from "@/components/Leaderboard";
import { QuizSkeleton } from "@/components/PageSkeletons";
import confetti from "canvas-confetti";

interface Question {
  id: string;
  topic: string;
  question: string;
  question_kn?: string | null;
  option_a: string;
  option_a_kn?: string | null;
  option_b: string;
  option_b_kn?: string | null;
  option_c: string;
  option_c_kn?: string | null;
  option_d: string;
  option_d_kn?: string | null;
  correct_answer: string;
}

type Phase = "name" | "study" | "quiz" | "results";

interface ShuffledOption {
  label: string;
  originalKey: string;
  text: string;
  textKn?: string | null;
}

type LanguageMode = "english" | "bilingual";

const LANGUAGE_KEY = "quiz-language-mode";
const STUDENT_NAME_KEY = "student-name";

const phaseIndexMap: Record<Phase, number> = {
  name: 1,
  study: 2,
  quiz: 3,
  results: 4,
};

const stepItems = [
  { step: 1, label: "Ready" },
  { step: 2, label: "Practice" },
  { step: 3, label: "Scored quiz" },
  { step: 4, label: "Results" },
];

const Quiz = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("name");
  const [studentName, setStudentName] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(STUDENT_NAME_KEY) || "";
  });
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studyAnswers, setStudyAnswers] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pastAttemptsCount, setPastAttemptsCount] = useState(0);

  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);

  const [showTestConfirmation, setShowTestConfirmation] = useState(false);
  const [showStudyReview, setShowStudyReview] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(() => {
    if (typeof window === "undefined") return "english";
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return stored === "bilingual" ? "bilingual" : "english";
  });
  const motionAllowed = useMemo(
    () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, languageMode);
  }, [languageMode]);

  // Animations disabled for performance and to prevent stale opacity/transform state.
  useLayoutEffect(() => {
    // no-op
  }, [
    currentQuizIndex,
    currentStudyIndex,
    motionAllowed,
    phase,
    showStudyReview,
    showTestConfirmation,
  ]);

  const renderWithLanguage = useCallback(
    (english: string, kannada?: string | null) => {
      if (languageMode === "bilingual" && kannada && kannada.trim()) {
        return (
          <div className="space-y-1.5">
            <div>{english}</div>
            <div className="text-sm leading-6 text-muted-foreground">{kannada}</div>
          </div>
        );
      }

      return english;
    },
    [languageMode],
  );

  const shuffledQuestions = useMemo(() => {
    if (phase !== "quiz") return [];
    return [...questions];
  }, [questions, phase]);

  const shuffledOptions = useMemo(() => {
    const map: Record<string, ShuffledOption[]> = {};
    const activeQuestions = phase === "quiz" ? shuffledQuestions : questions;
    activeQuestions.forEach((question) => {
      const options: ShuffledOption[] = [
        { label: "", originalKey: "A", text: question.option_a, textKn: question.option_a_kn },
        { label: "", originalKey: "B", text: question.option_b, textKn: question.option_b_kn },
        { label: "", originalKey: "C", text: question.option_c, textKn: question.option_c_kn },
        { label: "", originalKey: "D", text: question.option_d, textKn: question.option_d_kn },
      ];
      const shuffled = phase === "quiz" ? shuffleArray(options) : options;
      shuffled.forEach((option, index) => {
        option.label = ["A", "B", "C", "D"][index];
      });
      map[question.id] = shuffled;
    });
    return map;
  }, [questions, shuffledQuestions, phase]);

  const loadSession = useCallback(async () => {
    if (!code) {
      setError("Quiz link is incomplete.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: session, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("session_code", code)
        .single();

      if (sessionError || !session) {
        setError("Quiz not found. Please check the link and try again.");
        setLoading(false);
        return;
      }

      setSessionId(session.id);

      const { data: qs, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .in("id", session.question_ids);

      if (questionsError || !qs || qs.length === 0) {
        setError("This quiz is missing questions right now.");
        setLoading(false);
        return;
      }

      const sorted = [...qs].sort((a, b) => a.topic.localeCompare(b.topic));
      setQuestions(sorted);
    } catch {
      setError("We could not load this quiz right now.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleNameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentName.trim()) {
      toast.error("Enter your name to continue.");
      return;
    }

    const trimmed = studentName.trim();
    localStorage.setItem(STUDENT_NAME_KEY, trimmed);
    setStudentName(trimmed);
    setLoading(true);

    const { data: pastAttempts } = await supabase
      .from("quiz_attempts")
      .select("id, answers, total_questions, created_at")
      .eq("session_id", sessionId)
      .ilike("student_name", trimmed)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (pastAttempts) {
      const completed = pastAttempts.filter((attempt) => {
        const savedAnswers = attempt.answers && typeof attempt.answers === "object"
          ? (attempt.answers as Record<string, string>)
          : {};
        return Object.keys(savedAnswers).length >= attempt.total_questions;
      }).length;
      if (completed >= 3) {
        toast.error("You have reached the maximum number of attempts (3) for this quiz.");
        return;
      }
      setPastAttemptsCount(completed);

      const inProgress = pastAttempts.find((attempt) => {
        const savedAnswers = attempt.answers && typeof attempt.answers === "object"
          ? (attempt.answers as Record<string, string>)
          : {};
        return Object.keys(savedAnswers).length < attempt.total_questions;
      });
      if (inProgress) {
        setAttemptId(inProgress.id);
        if (inProgress.answers) {
          setAnswers(inProgress.answers as Record<string, string>);
          toast.success("Resuming your previous attempt!");
        }
      }
    }

    setPhase("study");
  };

  const startScoredQuiz = async () => {
    setShowTestConfirmation(false);

    if (!attemptId) {
      setLoading(true);
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({
          session_id: sessionId,
          student_name: studentName.trim(),
          answers: {},
          score: 0,
          total_questions: questions.length,
        })
        .select()
        .single();

      setLoading(false);

      if (error || !data) {
        toast.error("Could not start quiz attempt.");
        return;
      }
      setAttemptId(data.id);
    }

    setPhase("quiz");
  };

  useEffect(() => {
    if (phase !== "quiz" || !attemptId || Object.keys(answers).length === 0) return;

    const saveProgress = async () => {
      if (submittingRef.current) return;
      await supabase.from("quiz_attempts").update({ answers }).eq("id", attemptId);
    };

    const timer = setTimeout(saveProgress, 1500);
    return () => clearTimeout(timer);
  }, [answers, attemptId, phase]);

  const selectStudyAnswer = (questionId: string, originalKey: string) => {
    if (studyAnswers[questionId]) return;
    setStudyAnswers((prev) => ({ ...prev, [questionId]: originalKey }));
  };

  const selectAnswer = (questionId: string, originalKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: originalKey }));
  };

  const submittingRef = useRef(false);

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Answer every question before submitting.");
      return;
    }

    // Lock auto-save so it cannot overwrite the final score
    submittingRef.current = true;

    let correct = 0;
    questions.forEach((question) => {
      if (answers[question.id] === question.correct_answer) correct++;
    });

    setScore(correct);
    setPhase("results");
    setSubmitting(true);

    const percentage = (correct / questions.length) * 100;
    if (percentage >= 60 && motionAllowed) {
      confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.62 },
        colors: ["#2563EB", "#F5B400", "#0EA5E9", "#34D399"],
      });
    }

    const payload = { score: correct, answers };

    try {
      let submitError;
      if (attemptId) {
        const { error } = await supabase.from("quiz_attempts").update(payload).eq("id", attemptId);
        submitError = error;
      } else {
        const { error } = await supabase.from("quiz_attempts").insert({
          session_id: sessionId,
          student_name: studentName.trim(),
          total_questions: questions.length,
          ...payload,
        });
        submitError = error;
      }

      if (submitError) {
        console.error(submitError);
        toast.error("Saved locally — we'll retry syncing your score.", { duration: 4000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const studyCompletedCount = Object.keys(studyAnswers).length;
  const studyCorrectCount = questions.filter((question) => studyAnswers[question.id] === question.correct_answer).length;
  const studyProgress = questions.length > 0 ? Math.round((studyCompletedCount / questions.length) * 100) : 0;
  const quizAnsweredCount = Object.keys(answers).length;
  const quizProgress = questions.length > 0 ? Math.round((quizAnsweredCount / questions.length) * 100) : 0;
  const activeStep = phaseIndexMap[phase];

  const LanguageSwitcher = () => (
    <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-border bg-background/90 p-1.5">
      <button
        type="button"
        onClick={() => setLanguageMode("english")}
        className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          languageMode === "english"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary/80"
        }`}
      >
        English only
      </button>
      <button
        type="button"
        onClick={() => setLanguageMode("bilingual")}
        className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          languageMode === "bilingual"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary/80"
        }`}
      >
        English + Kannada
      </button>
    </div>
  );

  const PhaseStepper = () => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stepItems.map((item) => {
        const isActive = activeStep === item.step;
        const isCompleted = activeStep > item.step;

        return (
          <div
            key={item.label}
            data-step
            className={`rounded-[20px] border px-3 py-3 text-left transition-colors ${
              isActive
                ? "border-primary bg-primary/10"
                : isCompleted
                  ? "border-success/30 bg-success/10"
                  : "border-border bg-card/70"
            }`}
          >
            <p className="eyebrow">{`Step ${item.step}`}</p>
            <p className="mt-1 text-sm font-bold text-foreground">{item.label}</p>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return <QuizSkeleton />;
  }

  if (error) {
    return (
      <div className="page-bg flex min-h-screen items-center justify-center px-5">
        <div className="surface-panel w-full max-w-md p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-3xl font-extrabold">This quiz is not available</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{error}</p>
          <Button className="btn-primary mt-6 h-12 w-full" onClick={() => navigate("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "name") {
    return (
      <div className="page-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md" ref={sceneRef} data-stage>
          <div className="flex justify-end mb-4">
            <DarkModeToggle />
          </div>

          <section className="surface-panel p-7 sm:p-9 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            
            <p className="chip-primary mt-5">Session {code}</p>
            <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Ready to practice?</h1>

            <form onSubmit={handleNameSubmit} className="mt-6 space-y-3">
              <div className="flex gap-2 p-1 rounded-2xl bg-secondary/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLanguageMode("english")}
                  className={`flex-1 rounded-xl h-10 text-xs font-bold ${
                    languageMode === "english" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  English
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLanguageMode("bilingual")}
                  className={`flex-1 rounded-xl h-10 text-xs font-bold ${
                    languageMode === "bilingual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  EN + Kannada
                </Button>
              </div>
              <FloatingInput
                label="Your name"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                autoFocus
                className="h-13 rounded-2xl bg-background/80"
              />
              <Button type="submit" className="btn-primary h-13 w-full text-sm">
                Begin round
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "study") {
    if (showTestConfirmation) {
      return (
        <div ref={sceneRef} className="page-bg flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-sm text-center" data-stage>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Target className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">Ready for scored test?</h1>
            
            <div className="mt-6 grid gap-3 grid-cols-2">
              <div className="metric-card text-center" data-stat>
                <p className="eyebrow">Correct</p>
                <p className="mt-1 text-xl font-extrabold">
                  {studyCorrectCount}/{questions.length}
                </p>
              </div>
              <div className="metric-card text-center" data-stat>
                <p className="eyebrow">Readiness</p>
                <p className="mt-1 text-xl font-extrabold">{studyProgress}%</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-center">
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl text-sm"
                onClick={() => setShowTestConfirmation(false)}
              >
                Go back
              </Button>
              <Button
                className="btn-primary h-12 w-full text-sm"
                onClick={startScoredQuiz}
              >
                Start quiz
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (showStudyReview) {
      const wrongQuestions = questions.filter(
        (question) => studyAnswers[question.id] && studyAnswers[question.id] !== question.correct_answer,
      );
      const correctCount = questions.filter((question) => studyAnswers[question.id] === question.correct_answer).length;

      return (
        <div ref={sceneRef} className="page-bg">
          <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 sm:px-6">
            <div className="fixed right-4 top-4 z-40">
              <DarkModeToggle />
            </div>

            <div className="hero-shell mt-4 p-5 sm:p-6" data-stage>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow">Practice finished</p>
                  <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Review your weak spots</h1>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="metric-card text-center" data-stat>
                  <p className="eyebrow">Missed</p>
                  <p className="mt-1 text-2xl font-extrabold text-destructive">
                    {wrongQuestions.length}
                  </p>
                </div>
                <div className="metric-card text-center" data-stat>
                  <p className="eyebrow">Correct</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {correctCount}<span className="text-sm text-muted-foreground font-semibold">/{questions.length}</span>
                  </p>
                </div>
              </div>
            </div>

            {wrongQuestions.length > 0 && (
              <div className="mt-6 space-y-4" data-stage>
                {wrongQuestions.map((question, index) => {
                  const studentAnswer = studyAnswers[question.id];

                  return (
                    <div key={question.id} className="surface-panel p-5 sm:p-6">
                      <p className="eyebrow">{question.topic}</p>
                      <p className="mt-2 text-lg font-bold leading-8 text-foreground">
                        {index + 1}. {renderWithLanguage(question.question, question.question_kn)}
                      </p>

                      <div className="mt-5 grid gap-2">
                        {(["A", "B", "C", "D"] as const).map((key) => {
                          const text = question[`option_${key.toLowerCase()}` as keyof Question] as string;
                          const textKn = question[
                            `option_${key.toLowerCase()}_kn` as keyof Question
                          ] as string | null | undefined;
                          const isCorrect = question.correct_answer === key;
                          const isStudentPick = studentAnswer === key;

                          let className = "border-border bg-background/70 text-muted-foreground";
                          if (isCorrect) {
                            className = "border-success/35 bg-success/10 text-foreground";
                          } else if (isStudentPick) {
                            className = "border-destructive/35 bg-destructive/10 text-foreground";
                          }

                          return (
                            <div key={key} className={`rounded-[20px] border p-4 text-sm leading-6 ${className}`}>
                              <span className="mr-2 font-mono font-bold">{key}.</span>
                              {renderWithLanguage(text, textKn)}
                              {isCorrect ? <CheckCircle2 className="ml-2 inline h-4 w-4" /> : null}
                              {isStudentPick && !isCorrect ? (
                                <XCircle className="ml-2 inline h-4 w-4" />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="btn-secondary h-12 flex-1 text-sm"
                onClick={() => {
                  setShowStudyReview(false);
                  setStudyAnswers({});
                  setCurrentStudyIndex(0);
                }}
              >
                Restart practice
              </Button>
              <Button
                className="btn-primary h-12 flex-1 text-sm"
                onClick={() => {
                  setShowStudyReview(false);
                  setShowTestConfirmation(true);
                }}
              >
                Move to scored quiz ({3 - pastAttemptsCount} attempts left)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const question = questions[currentStudyIndex];
    if (!question) return null;
    const options = shuffledOptions[question.id] || [];
    const hasGuessed = !!studyAnswers[question.id];

    return (
      <div ref={sceneRef} className="page-bg">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-32 pt-14 sm:px-6 sm:pt-16">
          <div className="floating-ui-anchor">
            <DarkModeToggle />
          </div>

          <div data-stage>
            <p className="chip-primary">Practice mode</p>
            <div className="surface-panel mt-4 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="eyebrow">Warm-up before the score</p>
                  <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Practice round</h1>
                </div>
                <div className="question-counter">{currentStudyIndex + 1} / {questions.length}</div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Progress</span>
                    <span className="text-foreground">
                      {studyCompletedCount}/{questions.length}
                    </span>
                  </div>
                  <div className="progress-track mt-2">
                    <div className="progress-fill" style={{ width: `${studyProgress}%` }} />
                  </div>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1" data-stage>
            <div className="hero-shell p-5 sm:p-6">
              <p className="eyebrow">{question.topic}</p>
              <div className="mt-3 text-lg font-bold leading-8 text-foreground sm:text-xl">
                {renderWithLanguage(question.question, question.question_kn)}
              </div>

              <div className="mt-6 grid gap-3">
                {options.map((option) => {
                  const isCorrect = question.correct_answer === option.originalKey;
                  const isPicked = studyAnswers[question.id] === option.originalKey;

                  let optionClass = "option-card";
                  if (hasGuessed) {
                    if (isCorrect) {
                      optionClass += " border-success/35 bg-success/10 text-foreground";
                    } else if (isPicked) {
                      optionClass += " border-destructive/35 bg-destructive/10 text-foreground";
                    } else {
                      optionClass += " opacity-60";
                    }
                  }

                  return (
                    <button
                      key={option.originalKey}
                      type="button"
                      data-option
                      onClick={() => selectStudyAnswer(question.id, option.originalKey)}
                      disabled={hasGuessed}
                      className={optionClass}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${
                          hasGuessed && isCorrect
                            ? "border-success/30 bg-success text-success-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div className="min-w-0 flex-1 text-sm font-medium leading-6 sm:text-base">
                        {renderWithLanguage(option.text, option.textKn)}
                      </div>
                      {hasGuessed && isCorrect ? (
                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" />
                      ) : null}
                      {hasGuessed && isPicked && !isCorrect ? (
                        <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bottom-bar">
            <div className="mx-auto flex max-w-3xl gap-2 sm:gap-3">
              <Button
                className="btn-secondary h-11 px-3 text-sm"
                onClick={() => setCurrentStudyIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentStudyIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              {currentStudyIndex < questions.length - 1 ? (
                <Button
                  className="btn-primary h-11 flex-1 text-sm"
                  onClick={() => setCurrentStudyIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={!hasGuessed}
                >
                  Next question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="btn-primary h-11 flex-1 text-sm"
                  onClick={() => setShowStudyReview(true)}
                  disabled={!hasGuessed}
                >
                  Review practice
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const question = shuffledQuestions[currentQuizIndex];
    if (!question) return null;
    const options = shuffledOptions[question.id] || [];

    return (
      <div ref={sceneRef} className="page-bg">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-36 pt-14 sm:px-6 sm:pt-16">
          <div className="floating-ui-anchor">
            <DarkModeToggle />
          </div>

          <div data-stage>
            <p className="chip-primary">Scored quiz</p>
            <div className="surface-panel mt-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow">Ongoing attempt</p>
                  <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{studentName}</h1>
                  <p className="text-xs text-muted-foreground">{question.topic}</p>
                </div>
                <div className="question-counter">{currentQuizIndex + 1} / {questions.length}</div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Answered</span>
                    <span className="text-foreground">
                      {quizAnsweredCount}/{questions.length}
                    </span>
                  </div>
                  <div className="progress-track mt-2">
                    <div className="progress-fill" style={{ width: `${quizProgress}%` }} />
                  </div>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1" data-stage>
            <div className="hero-shell p-5 sm:p-6">
              <div className="text-lg font-bold leading-8 text-foreground sm:text-xl">
                {renderWithLanguage(question.question, question.question_kn)}
              </div>

              <div className="mt-6 grid gap-3">
                {options.map((option) => {
                  const selected = answers[question.id] === option.originalKey;

                  return (
                    <button
                      key={option.originalKey}
                      type="button"
                      data-option
                      onClick={() => selectAnswer(question.id, option.originalKey)}
                      className={`${selected ? "option-card option-card-selected" : "option-card"}`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div className={`min-w-0 flex-1 text-sm leading-6 sm:text-base ${selected ? "font-bold" : "font-medium"}`}>
                        {renderWithLanguage(option.text, option.textKn)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bottom-bar">
            <div className="mx-auto max-w-3xl space-y-3">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  className="btn-secondary h-11 px-3 text-sm sm:flex-1"
                  onClick={() => setCurrentQuizIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuizIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                {currentQuizIndex < questions.length - 1 ? (
                  <Button
                    className="btn-secondary h-11 flex-1 text-sm"
                    onClick={() => setCurrentQuizIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              <Button
                className="btn-primary h-12 w-full text-sm sm:h-14"
                onClick={submitQuiz}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting answers
                  </>
                ) : (
                  <>Submit quiz ({quizAnsweredCount}/{questions.length})</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div ref={sceneRef} className="page-bg">
      <div className="mx-auto max-w-3xl px-4 pb-14 pt-16 sm:px-6">
        <div className="floating-ui-anchor">
          <DarkModeToggle />
        </div>

        <div data-stage>
          <p className="chip-primary">Results saved</p>
          <div className="hero-shell mt-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Session complete</p>
                <h1 className="mt-1 text-3xl font-extrabold">{percentage}%</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved for {studentName}.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Trophy className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="metric-card text-center" data-stat>
                <p className="eyebrow">Correct</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {score}<span className="text-sm font-semibold text-muted-foreground">/{questions.length}</span>
                </p>
              </div>
              <div className="metric-card text-center" data-stat>
                <p className="eyebrow">Status</p>
                <p className="mt-1 text-lg font-extrabold">
                  {percentage >= 80 ? "Excellent" : percentage >= 60 ? "Strong" : "Needs review"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="btn-primary h-12 flex-1 text-sm" onClick={() => navigate("/")}>
            Back to dashboard
          </Button>
          <Button variant="outline" className="h-12 flex-1 rounded-2xl text-sm" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>

        <div className="mt-3">
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-2xl text-sm"
          >
            <a href={`/leaderboard/session/${code}`}>
              <Trophy className="h-4 w-4" />
              View full leaderboard
            </a>
          </Button>
        </div>

        <div className="mt-6 overflow-hidden" data-stage>
          <Leaderboard sessionId={sessionId} />
        </div>

        <section className="mt-6" data-stage>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Answer review</p>
              <h2 className="text-xl font-extrabold">See every question in context</h2>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {questions.map((question, index) => {
              const studentAnswer = answers[question.id];
              const isCorrect = studentAnswer === question.correct_answer;

              return (
                <div
                  key={question.id}
                  className={`surface-panel p-5 sm:p-6 ${
                    isCorrect
                      ? "border-success/30 bg-success/5"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <p className="eyebrow">{question.topic}</p>
                    <div className="text-base font-bold leading-7 sm:text-lg">
                      {index + 1}. {renderWithLanguage(question.question, question.question_kn)}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {isCorrect ? "Answered correctly." : "Marked for review."}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {(["A", "B", "C", "D"] as const).map((key) => {
                      const text = question[`option_${key.toLowerCase()}` as keyof Question] as string;
                      const textKn = question[
                        `option_${key.toLowerCase()}_kn` as keyof Question
                      ] as string | null | undefined;
                      const isThisCorrect = question.correct_answer === key;
                      const isStudentPick = studentAnswer === key;

                      let className = "border-border bg-background/70 text-muted-foreground";
                      if (isThisCorrect) {
                        className = "border-success/35 bg-success/10 text-foreground";
                      } else if (isStudentPick) {
                        className = "border-destructive/35 bg-destructive/10 text-foreground";
                      }

                      return (
                        <div key={key} className={`rounded-[20px] border p-4 text-sm leading-6 ${className}`}>
                          <span className="mr-2 font-mono font-bold">{key}.</span>
                          {renderWithLanguage(text, textKn)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Quiz;
