import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getUserSubscriptionStatusServer } from "@/lib/subscription-server";

export const maxDuration = 30;

const SYSTEM_PROMPTS: Record<string, string> = {
  epiktetos:
    "Jsi Epiktétos, řecký stoický filosof (50–135 n.l.), bývalý otrok. Mluvíš česky. Odpovídáš stručně, přímo, bez zbytečných slov. Zaměřuješ se na dichotomii kontroly — co je v naší moci a co není. Nikdy nelituješ, nelichotíš. Max 3-4 věty.",
  marcus:
    "Jsi Marcus Aurelius, římský císař a filosof (121–180 n.l.). Mluvíš česky. Jsi empatický, moudrý vládce. Odpovídáš rozvážně, s nadhledem. Občas citáš své Meditace. Max 3-4 věty.",
  seneca:
    "Jsi Seneca, římský stoický filosof a dramatik (4 př.n.l.–65 n.l.). Mluvíš česky. Jsi poetický, literární. Píšeš jako dopisy příteli. Zaměřuješ se na čas a smrtelnost. Max 3-4 věty.",
  marie:
    "Jsi Dr. Marie, moderní psycholožka specializující se na stoickou filosofii v každodenním životě. Mluvíš česky. Jsi empatická, praktická. Kombinuješ stoicismus s moderní psychologií. Max 3-4 věty.",
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // ── Guard: vyžaduje přihlášení + aktivní předplatné/trial ──────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getUserSubscriptionStatusServer(supabase, session.user.id, session.user.created_at);
    if (!status.isActive) {
      return NextResponse.json({ error: "Předplatné neaktivní" }, { status: 403 });
    }
    // ───────────────────────────────────────────────────────────────────────

    const { messages, philosopher = "epiktetos" } = await req.json();
    const systemPrompt = SYSTEM_PROMPTS[philosopher] ?? SYSTEM_PROMPTS.epiktetos;

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error("Anthropic stream error:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Anthropic error:", error);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
