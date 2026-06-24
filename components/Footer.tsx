import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="py-12 px-6"
      style={{ background: "rgba(6,6,15,0.75)", borderTop: "1px solid rgba(255,215,0,0.1)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div
              className="text-xl font-bold mb-1"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700", letterSpacing: "0.1em" }}
            >
              KLID V CHAOSU
            </div>
            <div className="text-xs opacity-40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Stoická moudrost pro moderní svět
            </div>
          </div>

          {/* Runes */}
          <div className="flex gap-6 text-2xl opacity-30" style={{ color: "#FFD700" }}>
            <span title="Fehu — hojnost">ᚠ</span>
            <span title="Sowilo — vítězství">ᛋ</span>
            <span title="Dagaz — úsvit">ᛞ</span>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-xs opacity-50 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Link href="/uvnitr/chat" className="hover:opacity-100 transition-opacity" style={{ color: "#FFD700" }}>
              Chat
            </Link>
            <Link href="/uvnitr/dychani" className="hover:opacity-100 transition-opacity" style={{ color: "#FFD700" }}>
              Dýchání
            </Link>
            <a href="#pricing" className="hover:opacity-100 transition-opacity" style={{ color: "#FFD700" }}>
              Cena
            </a>
          </div>
        </div>

        <div
          className="mt-8 pt-6 text-center text-xs opacity-25"
          style={{ borderTop: "1px solid rgba(255,215,0,0.1)", fontFamily: "'DM Sans', sans-serif" }}
        >
          © 2026 Klid v Chaosu · Všechna práva vyhrazena
        </div>
      </div>
    </footer>
  );
}
