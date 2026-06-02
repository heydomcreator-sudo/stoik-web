import Link from "next/link";

export default function PricingSection() {
  const items = [
    "Neomezený chat s Epiktétem, Senecem a Markem Aureliem",
    "Všechna dechová cvičení",
    "Stoický deník s denními výzvami",
    "Denní praxis cvičení",
    "Offline přístup k moudrosti",
    "Žádné reklamy, žádné rušení",
  ];

  return (
    <section id="pricing" className="py-24 px-6" style={{ background: "rgba(7,7,26,0.6)" }}>
      <div className="max-w-md mx-auto text-center">
        <p
          className="text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Cena
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold mb-12"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Investice do klidu
        </h2>

        <div
          className="p-10 rounded-2xl"
          style={{
            background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.3)",
            boxShadow: "0 0 60px rgba(255,215,0,0.08)",
          }}
        >
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88", fontFamily: "'DM Sans', sans-serif" }}
          >
            7 dní zdarma
          </div>

          <div className="mb-8">
            <span
              className="text-6xl font-bold"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
            >
              150
            </span>
            <span className="text-xl opacity-60 ml-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Kč / měsíc
            </span>
          </div>

          <ul className="text-left space-y-3 mb-8">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm opacity-80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ color: "#00FF88", flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/registrace"
            className="block w-full py-4 font-semibold tracking-widest uppercase text-sm transition-all hover:scale-105"
            style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a", borderRadius: "4px" }}
          >
            Začít zdarma
          </Link>

          <p className="text-xs opacity-40 mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Bez závazků. Zrušení kdykoliv.
          </p>
        </div>
      </div>
    </section>
  );
}
