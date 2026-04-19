import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { DailyViewSkeleton } from "@/components/PageSkeletons";
import curriculumData from "@/data/curriculum.json";

const STORAGE_KEY = "learnhub-progress";
type CurriculumSubject = (typeof curriculumData.subjects)[number];

function loadProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

const DailyView = () => {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [date, setDate] = useState<string>("");
  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const [learned, setLearned] = useState<Set<string>>(loadProgress);

  useEffect(() => {
    const fetch = async () => {
      const { data, error: fetchError } = await supabase
        .from("daily_topics")
        .select("*")
        .eq("share_code", code)
        .single();

      if (fetchError || !data) {
        setError("This share link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setSubjectId(data.subject_id);
      setTopicIds(data.topic_ids);
      setDate(data.date);
      setLoading(false);
    };

    void fetch();
  }, [code]);

  useEffect(() => {
    saveProgress(learned);
  }, [learned]);

  const subject = curriculumData.subjects.find((item) => item.id === subjectId);
  const topics = useMemo(() => {
    if (!subject) {
      return [];
    }

    return topicIds
      .map((id) => subject.topics.find((topic) => topic.id === id))
      .filter(Boolean) as CurriculumSubject["topics"];
  }, [subject, topicIds]);

  const accentColor = subjectId === "electronics" ? "#3B82F6" : "#10B981";

  const completedCount = useMemo(
    () => topics.filter((topic) => learned.has(`${subjectId}-${topic.id}`)).length,
    [learned, subjectId, topics],
  );

  const toggleLearned = (key: string) => {
    setLearned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loading) {
    return <DailyViewSkeleton />;
  }

  if (error || !subject) {
    return (
      <div className="page-bg flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel w-full max-w-md p-8 text-center">
          <h1 className="text-3xl font-extrabold">Link not available</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{error}</p>
          <Button asChild className="btn-primary mt-6 h-12 w-full text-sm">
            <Link to="/study">Go to study area</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
            <Link to="/study">
              <ArrowLeft className="h-4 w-4" />
              Study area
            </Link>
          </Button>
          <DarkModeToggle />
        </div>

        <section className="hero-shell mt-5 p-6 sm:p-8">
          <span className="chip-primary">Daily topic set</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-[3rem]">
            {subject.icon} Today&apos;s guided revision
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Focus on the exact topics shared for today, open each card for a fast explanation, and
            mark off what you have learned as you go.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Subject</p>
              <p className="mt-2 text-2xl font-extrabold">{subject.name}</p>
            </div>
            <div className="metric-card">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Completed</p>
              <p className="mt-2 text-3xl font-extrabold">
                {completedCount}
                <span className="text-lg font-semibold text-muted-foreground">/{topics.length}</span>
              </p>
            </div>
            <div className="metric-card">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Date</p>
              <p className="mt-2 text-2xl font-extrabold">
                {new Date(date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {topics.map((topic, index) => {
            const topicKey = `${subjectId}-${topic.id}`;
            const isLearned = learned.has(topicKey);
            const isOpen = openTopic === topic.id;
            const topicSymbol =
              "symbol" in topic && typeof topic.symbol === "string" && topic.symbol !== "-"
                ? topic.symbol
                : null;
            const topicFormula =
              "formula" in topic && typeof topic.formula === "string" ? topic.formula : null;

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`overflow-hidden rounded-[28px] border bg-card/90 ${
                  isLearned ? "border-success/35" : "border-border/70"
                }`}
                style={isOpen ? { borderColor: accentColor } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setOpenTopic(isOpen ? null : topic.id)}
                  className="flex w-full items-center gap-4 px-5 py-5 text-left"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-sm font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-foreground">{topic.title}</p>
                      {topicSymbol ? <Badge variant="secondary">{topicSymbol}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isLearned ? "Marked as learned" : "Tap to open notes and key points"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLearned ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 border-t border-border/70 bg-background/35 px-5 py-5">
                        <p className="text-sm leading-7 text-foreground">{topic.simple_explanation}</p>

                        {topic.example ? (
                          <div
                            className="flex gap-3 rounded-[22px] border border-transparent p-4 text-sm"
                            style={{ backgroundColor: `${accentColor}14` }}
                          >
                            <Lightbulb
                              className="mt-0.5 h-4 w-4 shrink-0"
                              style={{ color: accentColor }}
                            />
                            <span className="leading-6 text-foreground">{topic.example}</span>
                          </div>
                        ) : null}

                        {topicFormula ? (
                          <div className="rounded-[20px] border border-border/70 bg-card/85 p-4 font-mono text-sm text-foreground">
                            {topicFormula}
                          </div>
                        ) : null}

                        {topic.key_points && topic.key_points.length > 0 ? (
                          <div className="space-y-2">
                            {topic.key_points.map((point: string) => (
                              <div key={point} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <Button
                          className={`h-12 w-full rounded-2xl text-sm font-semibold ${
                            isLearned ? "" : "text-white"
                          }`}
                          style={
                            isLearned
                              ? { backgroundColor: "#0F9D74", color: "white" }
                              : { backgroundColor: accentColor, color: "white" }
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLearned(topicKey);
                          }}
                        >
                          {isLearned ? "Marked learned" : "Mark as learned"}
                        </Button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyView;
