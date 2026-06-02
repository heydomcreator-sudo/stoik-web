const cards = [
  {
    icon: "⚡",
    title: "Přehlcení",
    desc: "Sociální sítě, zprávy, notifikace — tvůj mozek je bombardován 24/7. Klid se zdá nedosažitelný.",
  },
  {
    icon: "🌀",
    title: "Ztráta kontroly",
    desc: "Pocit, že věci prostě jen plynou a ty je nesměřuješ. Reagováš místo abys jednal.",
  },
  {
    icon: "💬",
    title: "Prázdné rady",
    desc: '"Dýchej.' + "\" " + '"Buď vděčný.' + "\" Ty to víš. Ale nestačí to. Potřebuješ filozofii, ne náplast.",
  },
];

export default function PainSection() {
  return (
    <section className="py-24 px-6" style={{ background: "rgba(10,10,26,0.65)" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-center text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Znáš to
        </p>
        <h2
          className="text-3xl md:text-5xl font-bold text-center mb-16"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Moderní chaos má tři tváře
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((c) => (
            <div
              key={c.title}
              className="p-8 rounded-lg transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(255,215,0,0.04)",
                border: "1px solid rgba(255,215,0,0.15)",
              }}
            >
              <div className="text-4xl mb-5">{c.icon}</div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
              >
                {c.title}
              </h3>
              <p className="opacity-70 leading-relaxed text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
