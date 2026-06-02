"use client";
import Link from "next/link";

const messages = [
  {
    role: "user",
    text: "Proč se pořád cítím přetížený? Dělám vše co mám, ale neklid mě neopouští.",
  },
  {
    role: "philosopher",
    text: "Ptáš se špatně. Neptej se proč se cítíš přetížený — ptej se, čím jsi zatížil svou mysl věcmi, které nemůžeš ovládat. Kolik z toho, co dnes řešíš, je skutečně ve tvé moci?",
  },
  {
    role: "user",
    text: "Většina věcí asi ne... práce, co si o mně myslí ostatní, budoucnost.",
  },
  {
    role: "philosopher",
    text: "Přesně. Neseš břemena cizích lidí, cizích názorů a dnů, které ještě nepřišly. Odlož je. Co máš skutečně ve své moci právě teď, v tuto chvíli?",
  },
  {
    role: "user",
    text: "Asi jen to, jak reaguji. Co si myslím.",
  },
  {
    role: "philosopher",
    text: "To je vše. A to je dost. Člověk který vládne své mysli vládne všemu co na něm záleží. Začni tam.",
  },
  {
    role: "user",
    text: "Ale jak? Každý den je stejný kolotoč...",
  },
  {
    role: "philosopher",
    text: "Kolotoč existuje protože mu dáváš souhlas. Zítra ráno — dřív než sáhneš po telefonu — zeptej se: co je dnes skutečně v mé moci? Odpověz si. Pak jednej podle toho. Jen to.",
  },
];

export default function ChatDemoSection() {
  return (
    <section
      className="py-24 px-6 relative"
      style={{
        backgroundImage: "url('/portret_epictetus.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      <div className="relative z-10 max-w-2xl mx-auto">
        <p
          className="text-center text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Vyzkoušej
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Rozhovor s Epiktétem
        </h2>

        {/* Chat window */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,215,0,0.2)", background: "rgba(0,0,0,0.5)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{ background: "rgba(255,215,0,0.06)", borderBottom: "1px solid rgba(255,215,0,0.1)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: "2px solid #FFD700", background: "#0a0a1a" }}
            >
              <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "18px", fontWeight: 700 }}>Ε</span>
            </div>
            <div>
              <div className="font-semibold" style={{ fontFamily: "Cinzel, serif", fontSize: "14px", letterSpacing: "0.08em" }}>
                EPIKTÉTOS
              </div>
              <div className="text-xs flex items-center gap-1.5 opacity-80">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#00FF88" }} />
                <span style={{ color: "#00FF88", fontFamily: "'DM Sans', sans-serif" }}>Přítomen</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "philosopher" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ border: "1px solid #FFD700", background: "#0a0a1a" }}
                  >
                    <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "12px" }}>Ε</span>
                  </div>
                )}
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "#FFD700", color: "#0a0a1a", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,215,0,0.1)",
                          fontFamily: "'Crimson Pro', serif",
                          fontStyle: "italic",
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.9)",
                        }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Lock overlay */}
          <div
            className="mx-4 mb-4 rounded-xl px-6 py-5 text-center"
            style={{ background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.25)" }}
          >
            <div className="text-2xl mb-2">🔒</div>
            <p
              className="text-sm mb-4 opacity-80"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Pokračuj v rozhovoru s plným přístupem
            </p>
            <Link
              href="/registrace"
              className="inline-block px-6 py-3 text-sm font-semibold tracking-wider uppercase transition-all hover:scale-105"
              style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
            >
              Odemknout přístup
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
