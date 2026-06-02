"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getUser, logout } from "@/lib/auth";

const ICONS = [
  { src: "/icon_dychani.png", label: "DÝCHÁNÍ", onClick: (router: ReturnType<typeof useRouter>) => router.push("/uvnitr/dychani") },
  { src: "/icon_cteni.png", label: "KE ČTENÍ", onClick: (router: ReturnType<typeof useRouter>) => router.push("/uvnitr/obchod") },
  { src: "/icon_youtube.png", label: "YOUTUBE", onClick: () => window.open("https://www.youtube.com/@klidvchaosu", "_blank") },
];

const PHIL_ORDER = ["epiktetos", "marcus", "seneca"] as const;
type PhilKey = typeof PHIL_ORDER[number];

const PHILOSOPHER_DATA: Record<PhilKey, { name: string; file: string }> = {
  epiktetos: { name: "EPIKTÉTOS", file: "/portret_epictetus.png" },
  marcus: { name: "MARCUS AURELIUS", file: "/portre_m_a.png" },
  seneca: { name: "SENECA", file: "/portres_seneca.png" },
};

function getActivePhilosopher(): PhilKey {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return PHIL_ORDER[weekNumber % 3];
}

export default function UvnitrPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const activePhil = getActivePhilosopher();
  const activeIdx = PHIL_ORDER.indexOf(activePhil);
  const leftPhil = PHIL_ORDER[(activeIdx + 1) % 3];
  const rightPhil = PHIL_ORDER[(activeIdx + 2) % 3];

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/prihlaseni"); return; }
    setUser(u);
  }, [router]);

  const handleLogout = () => { logout(); router.push("/"); };

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/rome.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(8,6,5,0.65)" }} />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ background: "rgba(8,6,5,0.5)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}
      >
        <div className="flex items-center" style={{ gap: "16px" }}>
          <div className="flex flex-col items-center">
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(201,168,76,0.4)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
              <Image src="/domu.png" alt="Domů" fill style={{ objectFit: "cover" }} />
            </div>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "2px", color: "#c9a84c", marginTop: "3px" }}>DOMŮ</span>
          </div>
          <span style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "14px", letterSpacing: "0.15em" }}>
            KLID V CHAOSU
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:block" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            className="uppercase transition-all duration-200"
            style={{ fontFamily: "Cinzel, serif", fontSize: "12px", letterSpacing: "1px", color: "#ffffff", background: "transparent", border: "1px solid rgba(240,237,232,0.5)", borderRadius: "6px", padding: "6px 14px", cursor: "pointer" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#ffffff"; el.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "rgba(240,237,232,0.5)"; el.style.background = "transparent"; }}
          >
            Odhlásit se
          </button>
        </div>
      </header>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">

        {/* Announcement */}
        <p style={{ fontFamily: "Cinzel, serif", fontSize: "10px", letterSpacing: "3px", color: "rgba(201,168,76,0.6)", textAlign: "center", marginBottom: "16px" }}>
          Filozofové se střídají každý týden
        </p>

        {/* Three portraits */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative" }}>

          {/* Left inactive */}
          <div
            className="side-portrait inactive-portrait-left"
            style={{ borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(201,168,76,0.3)", filter: "brightness(0.35) saturate(0.3)", position: "relative", flexShrink: 0, zIndex: 5 }}
          >
            <Image src={PHILOSOPHER_DATA[leftPhil].file} alt={PHILOSOPHER_DATA[leftPhil].name} fill style={{ objectFit: "cover" }} />
          </div>

          {/* Main active */}
          <div
            onClick={() => router.push("/uvnitr/chat")}
            className="main-portrait"
            style={{ borderRadius: "50%", overflow: "hidden", border: "2.5px solid #c9a84c", boxShadow: "0 0 50px rgba(201,168,76,0.4)", position: "relative", flexShrink: 0, zIndex: 10, cursor: "pointer", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "scale(1.03)"; el.style.boxShadow = "0 0 70px rgba(201,168,76,0.6)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "scale(1)"; el.style.boxShadow = "0 0 50px rgba(201,168,76,0.4)"; }}
          >
            <Image src={PHILOSOPHER_DATA[activePhil].file} alt={PHILOSOPHER_DATA[activePhil].name} fill style={{ objectFit: "cover" }} priority />
          </div>

          {/* Right inactive */}
          <div
            className="side-portrait inactive-portrait-right"
            style={{ borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(201,168,76,0.3)", filter: "brightness(0.35) saturate(0.3)", position: "relative", flexShrink: 0, zIndex: 5 }}
          >
            <Image src={PHILOSOPHER_DATA[rightPhil].file} alt={PHILOSOPHER_DATA[rightPhil].name} fill style={{ objectFit: "cover" }} />
          </div>
        </div>

        {/* Active philosopher name */}
        <p style={{ fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "5px", color: "#c9a84c", marginTop: "20px", textAlign: "center" }}>
          {PHILOSOPHER_DATA[activePhil].name}
        </p>

        {/* "Chceš mi něco říct?" */}
        <p
          onClick={() => router.push("/uvnitr/chat")}
          className="cursor-pointer transition-opacity duration-200 hover:opacity-70"
          style={{ marginTop: "8px", fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "22px", color: "#c9a84c" }}
        >
          Chceš mi něco říct?
        </p>

        {/* Three icon buttons */}
        <div className="flex flex-row items-start justify-center" style={{ gap: "40px", marginTop: "32px" }}>
          {ICONS.map((icon) => (
            <div key={icon.label} className="flex flex-col items-center">
              <button
                onClick={() => icon.onClick(router)}
                className="flex items-center justify-center transition-all duration-200"
                style={{ width: "158px", height: "158px", background: "rgba(15,13,10,0.45)", backdropFilter: "blur(12px)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: "50%", overflow: "hidden", cursor: "pointer" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "rgba(201,168,76,0.8)"; el.style.transform = "scale(1.05)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "rgba(201,168,76,0.3)"; el.style.transform = "scale(1)"; }}
              >
                <Image src={icon.src} alt={icon.label} width={101} height={101} style={{ objectFit: "cover", borderRadius: "50%" }} />
              </button>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: "11px", fontWeight: 600, letterSpacing: "3px", color: "#c9a84c", marginTop: "10px", textAlign: "center", textTransform: "uppercase" }}>
                {icon.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .main-portrait { width: 200px; height: 200px; }
        .side-portrait { width: 120px; height: 120px; }
        .inactive-portrait-left { margin-right: -30px; }
        .inactive-portrait-right { margin-left: -30px; }
        @media (min-width: 640px) {
          .main-portrait { width: 280px; height: 280px; }
          .side-portrait { width: 180px; height: 180px; }
          .inactive-portrait-left { margin-right: -45px; }
          .inactive-portrait-right { margin-left: -45px; }
        }
      `}</style>
    </div>
  );
}
