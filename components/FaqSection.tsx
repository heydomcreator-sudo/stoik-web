"use client";
import { useState } from "react";

const faqs = [
  {
    q: "Musím znát stoicismus, abych mohl appku používat?",
    a: "Ne. Epiktétos tě provede od základů. Appka je navržena tak, aby stoicismus vysvětlila přirozeně — přes rozhovor, ne teorii.",
  },
  {
    q: "Jak funguje AI chat s filosofy?",
    a: "Každý filosof má svůj systémový prompt, styl a preferované témata. Epiktétos je přímý a direktivní. Seneca poetický. Marcus Aurelius meditativní. Vše běží na Claude AI.",
  },
  {
    q: "Jsou mé rozhovory soukromé?",
    a: "Ano. Konverzace nejsou sdíleny ani trénovány. Zpracovává je Anthropic API podle jejich podmínek ochrany dat.",
  },
  {
    q: "Co když to po 7 dnech nechci?",
    a: "Jednoduše zrušíš — v nastavení appky, bez poplatků, bez otázek. Žádný filosof tě nebude zadržovat.",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 px-6" style={{ background: "rgba(10,10,26,0.65)" }}>
      <div className="max-w-2xl mx-auto">
        <p
          className="text-center text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Otázky
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Časté dotazy
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,215,0,0.15)", background: "rgba(255,215,0,0.03)" }}
            >
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}
                >
                  {f.q}
                </span>
                <span
                  className="flex-shrink-0 text-xl transition-transform duration-200"
                  style={{ color: "#FFD700", transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div
                  className="px-6 pb-5 text-sm opacity-70 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
