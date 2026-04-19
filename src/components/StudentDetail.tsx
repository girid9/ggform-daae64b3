import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  topic: string;
}

interface Props {
  attempt: {
    student_name: string;
    score: number;
    total_questions: number;
    answers: Record<string, string>;
    created_at: string;
  };
  questionIds: string[];
  onBack: () => void;
}

const StudentDetail = ({ attempt, questionIds, onBack }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("quiz_questions")
        .select("*")
        .in("id", questionIds);
      if (data) setQuestions(data);
    };
    load();
  }, [questionIds]);

  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
  const passed = percentage >= 60;

  return (
    <div className="page-bg min-h-screen px-4 py-6">
      <div className="mx-auto max-w-3xl">
      <div className="fixed right-4 top-4 z-20"><DarkModeToggle /></div>

      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 gap-1.5 rounded-full text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <Card className="hero-shell animate-scale-in overflow-hidden border-0 text-center">
        <div className={`h-1.5 w-full ${passed ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-gradient-to-r from-destructive to-rose-400"}`} />
        <CardContent className="px-6 py-8">
          <p className="eyebrow">Student attempt</p>
          <h2 className="mt-2 text-3xl font-bold font-display">{attempt.student_name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(attempt.created_at).toLocaleString()}
          </p>
          <div className={`mt-5 inline-flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-primary/10" : "bg-destructive/10"}`}>
            <span className={`text-3xl font-extrabold font-display ${passed ? "text-primary" : "text-destructive"}`}>
              {percentage}%
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold">
            {attempt.score}/{attempt.total_questions} correct
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const studentAnswer = attempt.answers[q.id];
          const isCorrect = studentAnswer === q.correct_answer;
          return (
            <Card key={q.id} className={`surface-panel animate-fade-up border-0 ${isCorrect ? "ring-1 ring-primary/15" : "ring-1 ring-destructive/15"}`} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
              <CardContent className="px-5 pb-5 pt-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${isCorrect ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-7">
                      <span className="text-muted-foreground mr-1">Q{idx + 1}.</span> {q.question}
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">{q.topic}</p>
                  </div>
                </div>
                <div className="ml-12 grid gap-2">
                  {(["A", "B", "C", "D"] as const).map((key) => {
                    const text = q[`option_${key.toLowerCase()}` as keyof Question] as string;
                    const isThisCorrect = q.correct_answer === key;
                    const isStudentPick = studentAnswer === key;
                    let cls = "border-border/50 text-muted-foreground";
                    if (isThisCorrect) cls = "border-primary/25 bg-primary/[0.08] text-foreground font-semibold";
                    else if (isStudentPick) cls = "border-destructive/30 bg-destructive/[0.08] text-destructive";
                    return (
                      <div key={key} className={`rounded-[18px] border px-4 py-3 text-xs ${cls}`}>
                        <span className="font-bold mr-1.5 opacity-60">{key}.</span> {text}
                        {isThisCorrect && <CheckCircle2 className="w-3 h-3 inline ml-1.5 -mt-0.5 opacity-70" />}
                        {isStudentPick && !isThisCorrect && <XCircle className="w-3 h-3 inline ml-1.5 -mt-0.5 opacity-70" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default StudentDetail;
