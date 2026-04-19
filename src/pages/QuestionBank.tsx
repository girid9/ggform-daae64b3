import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface Question {
  id: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data } = await supabase.from("quiz_questions").select("*").order("topic");
      if (data) {
        setQuestions(data);
      }
      setLoading(false);
    };

    void fetchQuestions();
  }, []);

  const topics = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((question) => {
      map.set(question.topic, (map.get(question.topic) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions]);

  const filtered = useMemo(
    () =>
      questions.filter((question) => {
        const matchesTopic = topicFilter === "all" || question.topic === topicFilter;
        const term = search.toLowerCase();
        const matchesSearch =
          !term ||
          question.question.toLowerCase().includes(term) ||
          question.topic.toLowerCase().includes(term);

        return matchesTopic && matchesSearch;
      }),
    [questions, topicFilter, search],
  );

  const groupedByTopic = useMemo(() => {
    const map = new Map<string, Question[]>();
    filtered.forEach((question) => {
      if (!map.has(question.topic)) {
        map.set(question.topic, []);
      }
      map.get(question.topic)?.push(question);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

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
          <span className="chip-primary">Question bank</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-[3.1rem]">
            Browse the full question library with less noise and better scanning.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Search by wording, filter by topic, and expand only the sections you need while keeping
            correct answers easy to inspect.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Questions</p>
              <p className="mt-2 text-3xl font-extrabold">{questions.length}</p>
            </div>
            <div className="metric-card">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Topics</p>
              <p className="mt-2 text-3xl font-extrabold">{topics.length}</p>
            </div>
            <div className="metric-card">
              <Search className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Showing</p>
              <p className="mt-2 text-3xl font-extrabold">{filtered.length}</p>
            </div>
            <div className="metric-card">
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Expanded</p>
              <p className="mt-2 text-3xl font-extrabold">{expandedTopics.size}</p>
            </div>
          </div>
        </section>

        <section className="surface-panel mt-5 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Search by question text or topic"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 rounded-[22px] border-border/70 bg-card/85 pl-11 text-sm"
              />
            </div>
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="h-12 rounded-[22px] border-border/70 bg-card/85 text-sm">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics ({questions.length})</SelectItem>
                {topics.map(([topic, count]) => (
                  <SelectItem key={topic} value={topic}>
                    {topic} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {loading ? (
          <div className="surface-panel mt-5 p-16 text-center">
            <p className="text-sm text-muted-foreground">Loading questions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="surface-panel mt-5 border-0">
            <CardContent className="py-16 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h2 className="mt-5 text-2xl font-extrabold">No matching questions</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Try changing the search term or switching back to all topics.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-5 space-y-4">
            {groupedByTopic.map(([topic, topicQuestions], index) => {
              const isExpanded = expandedTopics.has(topic);

              return (
                <Card
                  key={topic}
                  className="card-interactive overflow-hidden rounded-[28px] border border-border/70 bg-card/90"
                  style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  >
                    <div>
                      <p className="text-lg font-bold text-foreground">{topic}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {topicQuestions.length} question{topicQuestions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-border/70 bg-background/35 px-5 py-5">
                      <div className="space-y-4">
                        {topicQuestions.map((question, questionIndex) => (
                          <div
                            key={question.id}
                            className="rounded-[24px] border border-border/70 bg-card/88 p-4"
                          >
                            <p className="text-sm font-semibold leading-7 text-foreground">
                              <span className="mr-2 text-muted-foreground">
                                {questionIndex + 1}.
                              </span>
                              {question.question}
                            </p>

                            <div className="mt-4 grid gap-2 md:grid-cols-2">
                              {(["A", "B", "C", "D"] as const).map((key) => {
                                const text = question[`option_${key.toLowerCase()}` as keyof Question] as string;
                                const isCorrect = question.correct_answer === key;

                                return (
                                  <div
                                    key={key}
                                    className={`rounded-[18px] border px-4 py-3 text-sm ${
                                      isCorrect
                                        ? "border-primary/25 bg-primary/10 font-semibold text-foreground"
                                        : "border-border/70 bg-background/70 text-muted-foreground"
                                    }`}
                                  >
                                    <span className="mr-2 font-bold">{key}.</span>
                                    {text}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
