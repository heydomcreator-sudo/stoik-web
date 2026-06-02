const features = [
  {
    num: "01",
    title: "Chat s filosofy",
    desc: "Epiktétos, Seneca, Marcus Aurelius. Každý filosof má svůj styl a moudrost staletí.",
    icon: "💬",
  },
  {
    num: "02",
    title: "Dýchání",
    desc: "Box breathing, 4-7-8, stoické techniky. Říď svůj nervový systém jako filosof.",
    icon: "🌬️",
  },
  {
    num: "03",
    title: "Stoický deník",
    desc: "Ranní memento mori. Večerní reflexe. Strukturované otázky od Marka Aurelia.",
    icon: "📖",
  },
  {
    num: "04",
    title: "Denní praxis",
    desc: "Každý den nová stoická výzva. Malé cvičení, velký posun ve vnímání světa.",
    icon: "⚔️",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: "rgba(10,10,26,0.65)" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-center text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Co dostaneš
        </p>
        <h2
          className="text-3xl md:text-5xl font-bold text-center mb-16"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Čtyři pilíře klidu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.num}
              className="p-8 rounded-xl flex gap-5 items-start transition-all duration-300 hover:-translate-y-1 group"
              style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.12)" }}
            >
              <div
                className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)" }}
              >
                {f.icon}
              </div>
              <div>
                <span
                  className="text-xs tracking-widest opacity-40 block mb-1"
                  style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
                >
                  {f.num}
                </span>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm opacity-70 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
