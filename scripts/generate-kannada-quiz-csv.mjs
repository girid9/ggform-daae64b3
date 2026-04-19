import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "generated");
const outputCsvPath = path.join(outputDir, "quiz_questions_bilingual_kn_draft.csv");
const cachePath = path.join(outputDir, "kn-translation-cache.json");

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://xihmreasbrsyoschbdhm.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpaG1yZWFzYnJzeW9zY2hiZGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTI1MTEsImV4cCI6MjA5MTI4ODUxMX0.RR105b6VK2fWFS1oGzhr6CjDnTpSOpGLABihoXHoxBQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function retry(task, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function loadCache() {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

async function fetchAllQuestions() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await retry(() =>
      supabase
        .from("quiz_questions")
        .select("*")
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1)
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function translateLines(lines, attempt = 0) {
  const joined = lines.join("\n");
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: "kn",
    dt: "t",
    q: joined,
  });

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Translation request failed with ${response.status}`);
    }

    const payload = await response.json();
    const merged = payload[0].map((part) => part[0]).join("");
    const translatedLines = merged.split("\n");

    if (translatedLines.length !== lines.length) {
      if (lines.length === 1) {
        return [merged.trim()];
      }
      if (lines.length > 1) {
        const fallback = [];
        for (const line of lines) {
          const [single] = await translateLines([line], attempt);
          fallback.push(single);
        }
        return fallback;
      }
      throw new Error(
        `Line count mismatch while translating batch. Expected ${lines.length}, got ${translatedLines.length}`
      );
    }

    return translatedLines.map((line) => line.trim());
  } catch (error) {
    if (attempt < 3) {
      const backoffMs = 600 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return translateLines(lines, attempt + 1);
    }
    throw error;
  }
}

async function translateQuestionRow(row, cache) {
  const fields = [
    row.question,
    row.option_a,
    row.option_b,
    row.option_c,
    row.option_d,
  ];

  const missing = fields.filter((text) => !cache[text]);
  if (missing.length > 0) {
    const translated = await translateLines(missing);
    missing.forEach((text, index) => {
      cache[text] = translated[index] || "";
    });
  }

  return {
    ...row,
    question_kn: cache[row.question] || "",
    option_a_kn: cache[row.option_a] || "",
    option_b_kn: cache[row.option_b] || "",
    option_c_kn: cache[row.option_c] || "",
    option_d_kn: cache[row.option_d] || "",
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) {
        break;
      }
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  console.log("Fetching quiz bank from Supabase...");
  const questions = await fetchAllQuestions();
  console.log(`Found ${questions.length} questions.`);

  if (questions.length === 0) {
    throw new Error("No quiz questions found.");
  }

  const cache = await loadCache();
  let processed = 0;

  const translatedRows = await mapWithConcurrency(
    questions,
    4,
    async (row) => {
      const translated = await translateQuestionRow(row, cache);
      processed += 1;
      if (processed % 20 === 0 || processed === questions.length) {
        console.log(`Translated ${processed}/${questions.length} questions...`);
        await saveCache(cache);
      }
      return translated;
    }
  );

  const headers = [
    "id",
    "topic",
    "subject_id",
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
  ];

  const csvLines = [
    headers.join(","),
    ...translatedRows.map((row) =>
      headers
        .map((header) => csvEscape(row[header] ?? ""))
        .join(",")
    ),
  ];

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputCsvPath, csvLines.join("\n"), "utf8");
  await saveCache(cache);

  console.log(`Saved Kannada draft CSV to ${outputCsvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
