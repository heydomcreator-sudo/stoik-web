import Link from "next/link";

export default function FinalCtaSection() {
  return (
    <section
      className="py-32 px-6 text-center"
      style={{
        background: "rgba(10,10,26,0.6)",
        borderTop: "1px solid rgba(255,215,0,0.15)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <p
          className="text-xs tracking-[0.4em] uppercase mb-6 opacity-40"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Začni dnes
        </p>
        <h2
          className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
        >
          Klid není cíl.
          <br />
          <span style={{ color: "#fff" }}>Je to praxe.</span>
        </h2>
        <p
          className="text-lg opacity-60 mb-12 max-w-lg mx-auto"
          style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "20px" }}
        >
          &ldquo;Nehledej, aby se vše dělo jak chceš, ale přej si, aby se věci děly jak se dějí — a budeš klidný.&rdquo;
          <br />
          <span className="text-sm not-italic opacity-60 mt-2 block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            — Epiktétos
          </span>
        </p>
        <Link
          href="/registrace"
          className="inline-block px-12 py-5 font-semibold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
          style={{
            fontFamily: "Cinzel, serif",
            background: "#FFD700",
            color: "#0a0a1a",
          }}
        >
          Začít zdarma — 7 dní
        </Link>
      </div>
    </section>
  );
}
