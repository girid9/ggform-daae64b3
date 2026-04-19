import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiter (best-effort, per instance)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQ = 10;

function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (e && e.resetAt > now) {
    if (e.count >= MAX_REQ) return false;
    e.count++;
    return true;
  }
  rateMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
  return true;
}

function clip(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRate(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const question = clip(body.question, 1000);
    const correctAnswer = clip(body.correctAnswer, 10);
    const correctText = clip(body.correctText, 500);
    const studentAnswer = clip(body.studentAnswer, 10);
    const studentText = clip(body.studentText, 500);
    const topic = clip(body.topic, 200);

    if (!question || !correctAnswer || !studentAnswer) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a Socratic tutor for ICT students. A student just answered a quiz question incorrectly.

Your job:
1. Identify the specific misconception that likely led them to choose their wrong answer over the correct one.
2. Explain WHY their chosen answer is wrong using a brief, clear technical explanation.
3. Give a Socratic hint that guides them to understand the correct answer without simply stating it.
4. Keep it concise (3-4 sentences max), friendly, and encouraging.
5. Use simple language appropriate for students.
6. If relevant, use analogies or real-world examples.
7. After the English explanation, add a blank line and then provide the SAME explanation translated into Kannada (ಕನ್ನಡ). Label it "ಕನ್ನಡದಲ್ಲಿ:" before the Kannada text.

Format: Return the English explanation first, then a blank line, then "ಕನ್ನಡದಲ್ಲಿ:" followed by the Kannada translation. No markdown headers or bullet points. Keep it conversational.`;

    const userPrompt = `Topic: ${topic}
Question: ${question}
Correct answer: ${correctAnswer} - ${correctText}
Student chose: ${studentAnswer} - ${studentText}

Explain their misconception and guide them to understand why their answer is wrong.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const hint = data.choices?.[0]?.message?.content || "Could not generate a hint.";

    return new Response(JSON.stringify({ hint }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("socratic-hint error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
