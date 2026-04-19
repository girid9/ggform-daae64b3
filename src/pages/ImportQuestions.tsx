import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface ParsedQuestion {
  topic: string;
  question: string;
  question_kn?: string;
  option_a: string;
  option_a_kn?: string;
  option_b: string;
  option_b_kn?: string;
  option_c: string;
  option_c_kn?: string;
  option_d: string;
  option_d_kn?: string;
  correct_answer: string;
}

const ACCEPTED_TYPES = [".xlsx", ".xls", ".csv", ".txt", ".docx", ".json"];

const SAMPLE_DATA = [
  [
    "topic",
    "question",
    "question_kn",
    "option_a",
    "option_a_kn",
    "option_b",
    "option_b_kn",
    "option_c",
    "option_c_kn",
    "option_d",
    "option_d_kn",
    "correct_answer",
  ],
  [
    "Networking",
    "What does HTTP stand for?",
    "",
    "HyperText Transfer Protocol",
    "",
    "High Tech Transfer Protocol",
    "",
    "HyperText Transmission Protocol",
    "",
    "High Transfer Text Protocol",
    "",
    "A",
  ],
];

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    topic: ["topic", "subject", "category", "chapter"],
    question: ["question", "question_text", "q", "questiontext", "ques"],
    question_kn: ["question_kn", "question_kannada", "kannada_question", "question kannada"],
    option_a: ["option_a", "a", "optiona", "opt_a", "option a", "choice_a"],
    option_a_kn: ["option_a_kn", "option_a_kannada", "a_kn", "option a kannada"],
    option_b: ["option_b", "b", "optionb", "opt_b", "option b", "choice_b"],
    option_b_kn: ["option_b_kn", "option_b_kannada", "b_kn", "option b kannada"],
    option_c: ["option_c", "c", "optionc", "opt_c", "option c", "choice_c"],
    option_c_kn: ["option_c_kn", "option_c_kannada", "c_kn", "option c kannada"],
    option_d: ["option_d", "d", "optiond", "opt_d", "option d", "choice_d"],
    option_d_kn: ["option_d_kn", "option_d_kannada", "d_kn", "option d kannada"],
    correct_answer: ["correct_answer", "answer", "correct", "ans", "correctanswer", "correct answer", "key"],
  };

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase().replace(/[^a-z0-9_\s]/g, "");
    for (const [field, names] of Object.entries(aliases)) {
      if (names.includes(clean) && !(field in map)) {
        map[field] = index;
      }
    }
  });

  return map;
}

function rowsToQuestions(rows: string[][]): { questions: ParsedQuestion[]; errors: string[] } {
  if (rows.length < 2) {
    return { questions: [], errors: ["File has no data rows."] };
  }

  const headerMap = normalizeHeaders(rows[0]);
  const required = ["topic", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer"];
  const missing = required.filter((field) => !(field in headerMap));
  if (missing.length > 0) {
    return { questions: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  }

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, index) => {
    const get = (field: string) => (row[headerMap[field]] || "").trim();
    const questionText = get("question");
    if (!questionText) {
      errors.push(`Row ${index + 2}: missing question text.`);
      return;
    }

    const answer = get("correct_answer").toUpperCase();
    if (!["A", "B", "C", "D"].includes(answer)) {
      errors.push(`Row ${index + 2}: invalid answer "${answer}".`);
      return;
    }

    const optionA = get("option_a");
    const optionB = get("option_b");
    const optionC = get("option_c");
    const optionD = get("option_d");
    if (!optionA || !optionB || !optionC || !optionD) {
      errors.push(`Row ${index + 2}: one or more options are empty.`);
      return;
    }

    questions.push({
      topic: get("topic") || "General",
      question: questionText,
      question_kn: get("question_kn"),
      option_a: optionA,
      option_a_kn: get("option_a_kn"),
      option_b: optionB,
      option_b_kn: get("option_b_kn"),
      option_c: optionC,
      option_c_kn: get("option_c_kn"),
      option_d: optionD,
      option_d_kn: get("option_d_kn"),
      correct_answer: answer,
    });
  });

  return { questions, errors };
}

async function parseFile(file: File): Promise<{ rows: string[][]; errors: string[] }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const errors: string[] = [];

  if (extension === "json") {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      let list: Record<string, unknown>[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray((parsed as { questions?: unknown[] }).questions)) {
          list = (parsed as { questions: Record<string, unknown>[] }).questions;
        } else {
          for (const [topic, questions] of Object.entries(parsed)) {
            if (Array.isArray(questions)) {
              questions.forEach((question) => {
                if (question && typeof question === "object") {
                  list.push({ topic, ...(question as object) });
                }
              });
            }
          }
        }
      }

      if (list.length === 0) {
        return { rows: [], errors: ["JSON has no usable questions."] };
      }

      list = list.map((item) => {
        const next = { ...item } as Record<string, unknown>;
        if (!("correct_answer" in next) && "answer" in next) {
          next.correct_answer = next.answer;
        }
        return next;
      });

      const headerSet = new Set<string>();
      list.forEach((item) => Object.keys(item).forEach((key) => headerSet.add(key)));
      const headers = Array.from(headerSet);
      const rows = [headers, ...list.map((item) => headers.map((header) => String(item[header] ?? "")))];
      return { rows, errors };
    } catch {
      return { rows: [], errors: ["Invalid JSON format."] };
    }
  }

  if (["xlsx", "xls", "csv"].includes(extension)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    return { rows: rows.map((row) => row.map(String)), errors };
  }

  if (extension === "txt") {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      return { rows: [], errors: ["File is empty."] };
    }

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    return {
      rows: lines.map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""))),
      errors,
    };
  }

  if (extension === "docx") {
    try {
      const mammoth = await import("mammoth");
      const buffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.value, "text/html");
      const table = doc.querySelector("table");
      if (!table) {
        return { rows: [], errors: ["No table found in the Word document."] };
      }

      const rows: string[][] = [];
      table.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("td, th").forEach((cell) => cells.push(cell.textContent?.trim() || ""));
        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      return { rows, errors };
    } catch {
      return { rows: [], errors: ["Failed to parse the Word document."] };
    }
  }

  return { rows: [], errors: [`Unsupported file type: .${extension}`] };
}

const ImportQuestions = () => {
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setParsedQuestions([]);
    setParseErrors([]);
    setImported(false);

    try {
      const { rows, errors: fileErrors } = await parseFile(file);
      if (fileErrors.length > 0 && rows.length === 0) {
        setParseErrors(fileErrors);
        return;
      }

      const { questions, errors: rowErrors } = rowsToQuestions(rows);
      setParsedQuestions(questions);
      setParseErrors([...fileErrors, ...rowErrors]);
    } catch {
      setParseErrors(["Failed to read file. Check the format and try again."]);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleImport = async () => {
    if (parsedQuestions.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const { error: deleteError } = await supabase
        .from("quiz_questions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        throw deleteError;
      }

      for (let index = 0; index < parsedQuestions.length; index += 100) {
        const chunk = parsedQuestions.slice(index, index + 100);
        const { error } = await supabase.from("quiz_questions").insert(chunk);
        if (error) {
          throw error;
        }
      }

      setImportCount(parsedQuestions.length);
      setImported(true);
      toast.success(`${parsedQuestions.length} questions imported successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Import failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (format: "xlsx" | "csv") => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(SAMPLE_DATA);
    sheet["!cols"] = SAMPLE_DATA[0].map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(workbook, sheet, "Questions");
    XLSX.writeFile(workbook, format === "xlsx" ? "question_template.xlsx" : "question_template.csv");
  };

  const reset = () => {
    setParsedQuestions([]);
    setParseErrors([]);
    setFileName("");
    setImported(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
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
          <span className="chip-primary">Question import</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-[3.1rem]">
            Replace the question bank with a cleaner, easier import flow.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Drag in a spreadsheet, text export, JSON file, or Word table, preview what will be
            loaded, then publish the full replacement in one action.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <Upload className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Accepted formats</p>
              <p className="mt-2 text-3xl font-extrabold">{ACCEPTED_TYPES.length}</p>
            </div>
            <div className="metric-card">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Preview rows</p>
              <p className="mt-2 text-3xl font-extrabold">{parsedQuestions.length}</p>
            </div>
            <div className="metric-card">
              <AlertCircle className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Warnings</p>
              <p className="mt-2 text-3xl font-extrabold">{parseErrors.length}</p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <section className="surface-panel p-5 sm:p-6">
            <div
              className="rounded-[28px] border-2 border-dashed border-border/80 bg-card/70 p-8 text-center transition-colors hover:border-primary/40"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              {parsing ? (
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10 text-primary">
                  <Upload className="h-8 w-8" />
                </div>
              )}

              <h2 className="mt-5 text-2xl font-extrabold">
                {parsing ? "Reading your file..." : fileName || "Drop a file here or tap to browse"}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Supported formats: {ACCEPTED_TYPES.join(", ")}. Word imports expect a table on the
                first page.
              </p>

              <Input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
              />
            </div>

            {parseErrors.length > 0 ? (
              <div className="mt-5 rounded-[24px] border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Issues found</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-destructive/80">
                      {parseErrors.slice(0, 10).map((error, index) => (
                        <li key={`${error}-${index}`}>{error}</li>
                      ))}
                      {parseErrors.length > 10 ? (
                        <li>...and {parseErrors.length - 10} more.</li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            {parsedQuestions.length > 0 && !imported ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="btn-primary h-12 flex-1 text-sm" onClick={handleImport} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Replace bank with imported questions
                </Button>
                <Button variant="ghost" className="h-12 rounded-2xl text-sm" onClick={reset}>
                  <X className="h-4 w-4" />
                  Clear file
                </Button>
              </div>
            ) : null}
          </section>

          <section className="surface-panel p-5 sm:p-6">
            <p className="eyebrow">Templates</p>
            <h2 className="mt-2 text-2xl font-extrabold">Download a starter file</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Required columns are `topic`, `question`, `option_a`, `option_b`, `option_c`,
              `option_d`, and `correct_answer`. Kannada columns are optional.
            </p>

            <div className="mt-5 grid gap-3">
              <Button variant="outline" className="btn-secondary h-12 justify-start px-4 text-sm" onClick={() => downloadTemplate("xlsx")}>
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel template
              </Button>
              <Button variant="outline" className="btn-secondary h-12 justify-start px-4 text-sm" onClick={() => downloadTemplate("csv")}>
                <FileText className="h-4 w-4" />
                Download CSV template
              </Button>
            </div>
          </section>
        </div>

        {imported ? (
          <Card className="hero-shell mt-5 border-0">
            <CardContent className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <h2 className="mt-5 text-3xl font-extrabold">{importCount} questions imported</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                The question bank has been replaced and is ready for quiz creation.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild className="btn-primary h-12 px-5 text-sm">
                  <Link to="/questions">Open question bank</Link>
                </Button>
                <Button variant="outline" className="btn-secondary h-12 px-5 text-sm" onClick={reset}>
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {parsedQuestions.length > 0 ? (
          <Card className="surface-panel mt-5 border-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl font-extrabold">Preview imported rows</CardTitle>
            </CardHeader>
            <CardContent className="mt-5 overflow-hidden rounded-[24px] border border-border/70 bg-card/85 px-0 py-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead className="min-w-[280px]">Question</TableHead>
                      <TableHead className="min-w-[180px]">Kannada</TableHead>
                      <TableHead className="text-center">Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedQuestions.slice(0, 20).map((question, index) => (
                      <TableRow key={`${question.question}-${index}`}>
                        <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="text-sm font-semibold">{question.topic}</TableCell>
                        <TableCell className="text-sm">{question.question}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {question.question_kn || "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-bold text-primary">
                          {question.correct_answer}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedQuestions.length > 20 ? (
                <p className="border-t border-border/70 px-5 py-3 text-center text-xs text-muted-foreground">
                  Showing 20 of {parsedQuestions.length} rows.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ImportQuestions;
