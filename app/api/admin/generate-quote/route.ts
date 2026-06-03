import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LENGTH_LABELS: Record<string, string> = {
  short: "Krátký, přibližně 10 slov.",
  medium: "Střední délka, přibližně 20 slov.",
  long: "Delší, přibližně 40 slov.",
};

export async function POST(req: NextRequest) {
  try {
    const { philosopher, topic, length } = await req.json();

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `Jsi ${philosopher}. Napiš originální citát na téma ${topic}. Délka: ${LENGTH_LABELS[length] ?? LENGTH_LABELS.medium} Pouze citát, žádné uvozovky, žádné vysvětlení. Česky.`,
      messages: [{ role: "user", content: "Napiš citát." }],
    });

    const quote = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ quote });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
