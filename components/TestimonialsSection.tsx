const testimonials = [
  {
    name: "Marek V.",
    role: "Product manager, Praha",
    text: "Poprvé po třech letech nespím s telefonem. Ráno místo scrollování — otázka od Epiktéta. Změnilo to celý ráno.",
    stars: 5,
  },
  {
    name: "Tereza K.",
    role: "Učitelka, Brno",
    text: "Myslela jsem, že stoicismus je pro chlapce. Po týdnu v appce jsem přestala reagovat na věci, které nemohu ovlivnit. Paradoxně jsem teď efektivnější.",
    stars: 5,
  },
  {
    name: "Jakub R.",
    role: "Freelancer",
    text: "Dýchací cvičení před každým důležitým hovorem. Box breathing funguje víc než káva. A konverzace se Senekou jsou... nečekaně hluboké.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6" style={{ background: "rgba(7,7,26,0.6)" }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-center text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Zkušenosti
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-16"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Co říkají ostatní
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-7 rounded-xl"
              style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.12)" }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} style={{ color: "#FFD700", fontSize: "14px" }}>★</span>
                ))}
              </div>
              <p
                className="text-sm leading-relaxed mb-5 italic opacity-85"
                style={{ fontFamily: "'Crimson Pro', serif", fontSize: "15px" }}
              >
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <div className="font-semibold text-sm" style={{ color: "#FFD700", fontFamily: "Cinzel, serif" }}>
                  {t.name}
                </div>
                <div className="text-xs opacity-50 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
