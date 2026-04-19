import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Cpu, Briefcase, CheckCircle2, XCircle, Trophy, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { toast } from "sonner";

interface Question {
  id: string;
  topic: string;
  subject_id: string | null;
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

interface TopicScore {
  student_name: string;
  subject_id: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
}

const SUBJECTS = [
  {
    id: "ictsm",
    name: "ICTSM",
    full: "ICT & System Maintenance",
    icon: Cpu,
    color: "#3B82F6",
  },
  {
    id: "es",
    name: "ES",
    full: "Employability Skills",
    icon: Briefcase,
    color: "#10B981",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Step = "subject" | "topic" | "preview" | "quiz" | "result";

type LanguageMode = "english" | "bilingual";
const NAME_KEY = "student-name";
const LANGUAGE_KEY = "quiz-language-mode";

const Study = () => {
  const navigate = useNavigate();
  const studentName = (localStorage.getItem(NAME_KEY) || "").trim();

  const [step, setStep] = useState<Step>("subject");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<TopicScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(() => {
    if (typeof window === "undefined") return "english";
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return stored === "english" ? "english" : "bilingual";
  });

  // Quiz state
  const [quizQs, setQuizQs] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, languageMode);
  }, [languageMode]);

  useEffect(() => {
    if (!studentName) {
      navigate("/");
      return;
    }
    Promise.all([
      supabase.from("quiz_questions").select("*"),
      supabase.from("topic_scores").select("*"),
    ]).then(([qRes, sRes]) => {
      if (qRes.data) setQuestions(qRes.data as Question[]);
      if (sRes.data) setScores(sRes.data as TopicScore[]);
      setLoading(false);
    });
  }, [studentName, navigate]);

  const subject = SUBJECTS.find((s) => s.id === subjectId);

  const subjectTopicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    SUBJECTS.forEach((s) => {
      map[s.id] = new Set(
        questions.filter((q) => q.subject_id === s.id).map((q) => q.topic)
      ).size;
    });
    return map;
  }, [questions]);

  const topics = useMemo(() => {
    if (!subjectId) return [] as { name: string; count: number }[];
    const map = new Map<string, number>();
    questions
      .filter((q) => q.subject_id === subjectId)
      .forEach((q) => map.set(q.topic, (map.get(q.topic) || 0) + 1));
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjectId, questions]);

  const myBestForTopic = (sid: string, t: string): number | null => {
    const mine = scores.filter(
      (s) =>
        s.subject_id === sid &&
        s.topic === t &&
        s.student_name.toLowerCase() === studentName.toLowerCase()
    );
    if (!mine.length) return null;
    return Math.max(...mine.map((s) => s.percentage));
  };

  const topicLeaderboard = (sid: string, t: string) => {
    const filtered = scores.filter((s) => s.subject_id === sid && s.topic === t);
    const byStudent = new Map<string, TopicScore>();
    filtered.forEach((s) => {
      const k = s.student_name.toLowerCase();
      const prev = byStudent.get(k);
      if (!prev || s.percentage > prev.percentage) byStudent.set(k, s);
    });
    return Array.from(byStudent.values()).sort((a, b) => b.percentage - a.percentage);
  };

  const handlePickSubject = (id: string) => {
    setSubjectId(id);
    setStep("topic");
  };

  const handleStartTopic = (t: string) => {
    const tQs = questions.filter((q) => q.subject_id === subjectId && q.topic === t);
    if (tQs.length === 0) {
      toast.error("No questions for this topic yet");
      return;
    }
    setTopic(t);
    setQuizQs(shuffle(tQs));
    setQIndex(0);
    setAnswers({});
    setStep("preview");
  };

  const handleBeginQuiz = () => {
    setStep("quiz");
  };

  const handleAnswer = (opt: string) => {
    if (answers[qIndex]) return;
    setAnswers({ ...answers, [qIndex]: opt });
  };

  const handleNext = async () => {
    if (qIndex + 1 < quizQs.length) {
      setQIndex(qIndex + 1);
      return;
    }
    // finish
    let s = 0;
    quizQs.forEach((q, i) => {
      if (answers[i] === q.correct_answer) s++;
    });
    const pct = Math.round((s / quizQs.length) * 100);
    setFinalScore(s);
    setStep("result");
    if (pct >= 80) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    // save to DB
    const { error } = await supabase.from("topic_scores").insert({
      student_name: studentName,
      subject_id: subjectId!,
      topic: topic!,
      score: s,
      total: quizQs.length,
      percentage: pct,
    });
    if (error) toast.error("Could not save score");
    else {
      // refresh local scores
      const { data } = await supabase.from("topic_scores").select("*");
      if (data) setScores(data as TopicScore[]);
    }
  };

  const handleRetry = () => {
    if (!topic || !subjectId) return;
    handleStartTopic(topic);
  };

  const handleBack = () => {
    if (step === "result") {
      setStep("topic");
      setTopic(null);
    } else if (step === "quiz") {
      if (window.confirm("Exit quiz? Your progress will be lost.")) {
        setStep("topic");
        setTopic(null);
      }
    } else if (step === "preview") {
      setStep("topic");
      setTopic(null);
    } else if (step === "topic") {
      setStep("subject");
      setSubjectId(null);
    } else {
      navigate("/");
    }
  };

  const currentQ = quizQs[qIndex];
  const pickedNow = answers[qIndex];
  const revealed = !!pickedNow;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-bg">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 page-bg">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button onClick={handleBack} className="flex items-center gap-2 min-w-0 flex-1">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <h1 className="text-sm font-bold truncate">
              {step === "subject" && "Study Area"}
              {step === "topic" && subject?.full}
              {step === "preview" && topic}
              {step === "quiz" && topic}
              {step === "result" && "Results"}
            </h1>
          </button>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setLanguageMode((m) => (m === "english" ? "bilingual" : "english"))}
              className={`text-[10px] font-bold px-2.5 h-8 rounded-lg border transition-colors ${
                languageMode === "bilingual"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
              aria-label="Toggle Kannada"
            >
              {languageMode === "bilingual" ? "EN + ಕ" : "EN"}
            </button>
            <DarkModeToggle />
          </div>
        </div>
        {step === "quiz" && quizQs.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${((qIndex + 1) / quizQs.length) * 100}%`,
                  backgroundColor: subject?.color,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-muted-foreground font-bold tabular-nums">
                Q{qIndex + 1} / {quizQs.length}
              </p>
              <p className="text-[10px] font-bold tabular-nums" style={{ color: subject?.color }}>
                {Object.values(answers).filter((a, i) => a === quizQs[i]?.correct_answer).length} correct
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <AnimatePresence mode="wait">
          {/* SUBJECT */}
          {step === "subject" && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.16em]">Step 1</p>
                <h2 className="mt-1 text-2xl font-serif-display sm:text-3xl">
                  Pick a <span className="italic-serif text-primary">subject</span>
                </h2>
              </div>
              <div className="grid gap-3">
                {SUBJECTS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePickSubject(s.id)}
                      className="text-left rounded-2xl border-2 border-border bg-card p-5 hover:border-primary/40 transition-colors flex items-center gap-4 min-h-[96px]"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${s.color}20`, color: s.color }}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl leading-none font-serif-display sm:text-2xl">{s.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{s.full}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">
                          {subjectTopicCounts[s.id] || 0} topics
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TOPIC */}
          {step === "topic" && subject && (
            <motion.div
              key="topic"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.16em]">Step 2</p>
                <h2 className="mt-1 text-2xl font-serif-display sm:text-3xl">
                  Pick a <span className="italic-serif" style={{ color: subject.color }}>topic</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Each topic has its own score — beat your best!
                </p>
              </div>
              <div className="grid gap-2">
                {topics.map((t) => {
                  const best = myBestForTopic(subject.id, t.name);
                  const lb = topicLeaderboard(subject.id, t.name);
                  return (
                    <motion.button
                      key={t.name}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartTopic(t.name)}
                      className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors flex items-center gap-3 min-h-[64px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight">{t.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{t.count} Qs</span>
                          {lb.length > 0 && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-2.5 h-2.5" />
                                {lb[0].student_name} {lb[0].percentage}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {best !== null ? (
                        <div className="text-right flex-shrink-0">
                          <p
                            className="font-serif-display text-xl tabular-nums leading-none"
                            style={{ color: subject.color }}
                          >
                            {best}<span className="text-xs">%</span>
                          </p>
                          <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">
                            best
                          </p>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] flex-shrink-0"
                        >
                          NEW
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PREVIEW: leaderboard before quiz */}
          {step === "preview" && subject && topic && (() => {
            const lb = topicLeaderboard(subject.id, topic);
            const myRank = lb.findIndex(
              (e) => e.student_name.toLowerCase() === studentName.toLowerCase()
            );
            return (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.16em]">
                    Topic Leaderboard
                  </p>
                  <h2 className="mt-1 text-2xl font-serif-display sm:text-3xl">
                    <span className="italic-serif" style={{ color: subject.color }}>{topic}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {quizQs.length} questions • {lb.length} {lb.length === 1 ? "player" : "players"} so far
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
                  {lb.length === 0 ? (
                    <div className="p-6 text-center">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-bold">Be the first, bro</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No one's attempted this topic yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {lb.slice(0, 10).map((e, i) => {
                        const isMe = e.student_name.toLowerCase() === studentName.toLowerCase();
                        return (
                          <div
                            key={e.student_name}
                            className={`flex items-center gap-3 px-4 py-2.5 ${
                              isMe ? "bg-primary/10" : ""
                            }`}
                          >
                            <span className="w-6 text-center text-xs font-bold tabular-nums text-muted-foreground">
                              {i < 3 ? <Trophy className="w-3.5 h-3.5 inline text-amber-500" /> : i + 1}
                            </span>
                            <span className="flex-1 truncate text-sm font-medium">
                              {e.student_name}{isMe && " (you)"}
                            </span>
                            <span className={`text-xs font-bold tabular-nums ${
                              e.percentage >= 60 ? "text-primary" : "text-destructive"
                            }`}>
                              {e.percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {myRank >= 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Your best rank: <span className="font-bold text-foreground">#{myRank + 1}</span> · {lb[myRank].percentage}%
                  </p>
                )}

                <Button
                  onClick={handleBeginQuiz}
                  className="w-full h-14 text-base font-bold"
                  style={{ backgroundColor: subject.color, color: "white" }}
                >
                  Start Quiz <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </motion.div>
            );
          })()}

          {step === "quiz" && currentQ && (
            <motion.div
              key={`q-${qIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border-2 border-border bg-card p-5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                  Question {qIndex + 1} of {quizQs.length}
                </p>
                <p className="text-base font-bold leading-snug">{currentQ.question}</p>
                {languageMode === "bilingual" && currentQ.question_kn?.trim() && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentQ.question_kn}</p>
                )}
              </div>

              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const text = currentQ[`option_${opt.toLowerCase()}` as keyof Question] as string;
                  const textKn = currentQ[`option_${opt.toLowerCase()}_kn` as keyof Question] as string | null | undefined;
                  const isCorrect = currentQ.correct_answer === opt;
                  const isPicked = pickedNow === opt;
                  let stateClass = "border-border bg-card hover:border-primary/40";
                  if (revealed) {
                    if (isCorrect) stateClass = "border-emerald-500 bg-emerald-500/10";
                    else if (isPicked) stateClass = "border-red-500 bg-red-500/10";
                    else stateClass = "border-border bg-card opacity-60";
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      disabled={revealed}
                      className={`w-full text-left rounded-xl border-2 p-4 flex items-start gap-3 transition-all min-h-[56px] ${stateClass}`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor:
                            revealed && isCorrect
                              ? "#10B981"
                              : revealed && isPicked
                              ? "#EF4444"
                              : `${subject?.color}20`,
                          color: revealed && (isCorrect || isPicked) ? "#fff" : subject?.color,
                        }}
                      >
                        {opt}
                      </span>
                      <span className="flex-1 text-sm">
                        <span className="block">{text}</span>
                        {languageMode === "bilingual" && textKn && textKn.trim() && (
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{textKn}</span>
                        )}
                      </span>
                      {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />}
                      {revealed && isPicked && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={handleNext}
                    className="w-full h-12 rounded-xl font-bold"
                    style={{ backgroundColor: subject?.color, color: "#fff" }}
                  >
                    {qIndex + 1 < quizQs.length ? "Next Question →" : "Finish & See Score"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* RESULT */}
          {step === "result" && subject && topic && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {(() => {
                const pct = Math.round((finalScore / quizQs.length) * 100);
                const lb = topicLeaderboard(subject.id, topic);
                const myRank = lb.findIndex(
                  (e) => e.student_name.toLowerCase() === studentName.toLowerCase()
                ) + 1;
                return (
                  <>
                    <div
                      className="relative overflow-hidden rounded-3xl p-5 text-center text-white sm:p-6"
                      style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)` }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{topic}</p>
                      <p className="mt-3 text-6xl leading-none tabular-nums font-serif-display sm:text-7xl">{pct}%</p>
                      <p className="text-sm font-bold mt-2">
                        {finalScore} of {quizQs.length} correct
                      </p>
                      {myRank > 0 && (
                        <Badge className="mt-3 bg-white/20 text-white border-0 text-[10px]">
                          <Trophy className="w-3 h-3 mr-1" /> Rank #{myRank} on this topic
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={handleRetry}
                        className="flex-1 h-12 rounded-xl gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> Try Again
                      </Button>
                      <Button
                        onClick={() => {
                          setStep("topic");
                          setTopic(null);
                        }}
                        className="flex-1 h-12 rounded-xl font-bold"
                        style={{ backgroundColor: subject.color, color: "#fff" }}
                      >
                        Pick Another Topic
                      </Button>
                    </div>

                    {lb.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.16em] mb-2 px-1">
                          Topic Leaderboard
                        </p>
                        <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
                          {lb.slice(0, 8).map((e, i) => {
                            const isMe =
                              e.student_name.toLowerCase() === studentName.toLowerCase();
                            return (
                              <div
                                key={e.student_name + i}
                                className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 ${
                                  isMe ? "bg-primary/10" : i < 3 ? "bg-muted/40" : ""
                                }`}
                              >
                                <div className="w-8 text-center font-serif-display text-lg tabular-nums text-muted-foreground">
                                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm truncate ${isMe ? "font-black" : "font-bold"}`}>
                                    {e.student_name} {isMe && <span className="text-primary">★</span>}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground font-bold">
                                    {e.score}/{e.total}
                                  </p>
                                </div>
                                <div
                                  className="font-serif-display text-2xl tabular-nums"
                                  style={{ color: subject.color }}
                                >
                                  {e.percentage}<span className="text-xs">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Study;
