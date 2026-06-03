"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Section = "dashboard" | "generator" | "users" | "settings";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "generator", label: "Generátor obsahu", icon: "✦" },
  { id: "users", label: "Uživatelé", icon: "◎" },
  { id: "settings", label: "Nastavení", icon: "◇" },
];

const PHILOSOPHERS = ["Epiktétos", "Marcus Aurelius", "Seneca"];
const TOPICS = ["Klid", "Kontrola", "Čas", "Vztahy", "Práce", "Smrt"];
const LENGTHS = [
  { label: "Krátký (~10 slov)", value: "short" },
  { label: "Střední (~20 slov)", value: "medium" },
  { label: "Dlouhý (~40 slov)", value: "long" },
];

const S = {
  input: {
    background: "#1a1d27",
    border: "1px solid rgba(201,168,76,0.25)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "8px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    width: "100%",
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
  },
  label: {
    display: "block" as const,
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.4)",
    marginBottom: "8px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "#13151c",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontFamily: "Cinzel, serif",
    color: "#c9a84c",
    fontSize: "13px",
    letterSpacing: "0.12em",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(201,168,76,0.1)",
  },
};

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[] | string[];
}) {
  const normalized = options.map(o => typeof o === "string" ? { label: o, value: o } : o);
  return (
    <div>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={S.input}>
          {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#c9a84c", pointerEvents: "none", fontSize: "10px" }}>▾</span>
      </div>
    </div>
  );
}

function InstagramPreview({ quote, philosopher }: { quote: string; philosopher: string }) {
  return (
    <div style={{ maxWidth: "360px", width: "100%" }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          background: "linear-gradient(145deg, #0a0a1a 0%, #12081e 40%, #0d0a15 100%)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Subtle corner decorations */}
        <div style={{ position: "absolute", top: "16px", left: "16px", width: "20px", height: "20px", borderTop: "1px solid rgba(201,168,76,0.3)", borderLeft: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", top: "16px", right: "16px", width: "20px", height: "20px", borderTop: "1px solid rgba(201,168,76,0.3)", borderRight: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", bottom: "56px", left: "16px", width: "20px", height: "20px", borderBottom: "1px solid rgba(201,168,76,0.3)", borderLeft: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", bottom: "56px", right: "16px", width: "20px", height: "20px", borderBottom: "1px solid rgba(201,168,76,0.3)", borderRight: "1px solid rgba(201,168,76,0.3)" }} />

        {/* Quote */}
        <p style={{
          fontFamily: "'Crimson Pro', serif",
          fontStyle: "italic",
          fontSize: "18px",
          color: "rgba(255,255,255,0.92)",
          textAlign: "center",
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}>
          {quote}
        </p>

        {/* Attribution + Logo */}
        <div style={{ position: "absolute", bottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontFamily: "Cinzel, serif", fontSize: "8px", letterSpacing: "4px", color: "rgba(201,168,76,0.5)" }}>— {philosopher.toUpperCase()}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "3px", color: "#c9a84c" }}>KLID V CHAOSU</span>
            <span style={{ fontSize: "13px", color: "rgba(201,168,76,0.5)" }}>ᚠᛋᛞ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratorSection() {
  const [philosopher, setPhilosopher] = useState("Epiktétos");
  const [topic, setTopic] = useState("Klid");
  const [length, setLength] = useState("medium");
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setQuote("");
    try {
      const res = await fetch("/api/admin/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ philosopher, topic, length }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote(data.quote);
    } catch {
      setError("Nepodařilo se vygenerovat citát. Zkus to znovu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sekce 1 — Formulář */}
      <div style={S.card}>
        <div style={S.sectionTitle}>GENEROVÁNÍ CITÁTU</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <SelectField label="Filosof" value={philosopher} onChange={setPhilosopher} options={PHILOSOPHERS} />
          <SelectField label="Téma" value={topic} onChange={setTopic} options={TOPICS} />
          <SelectField label="Délka" value={length} onChange={setLength} options={LENGTHS} />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? "rgba(201,168,76,0.3)" : "#c9a84c",
            color: loading ? "rgba(0,0,0,0.5)" : "#0a0a1a",
            border: "none",
            padding: "12px 28px",
            borderRadius: "8px",
            fontFamily: "Cinzel, serif",
            fontSize: "13px",
            letterSpacing: "0.1em",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          {loading ? "Generuji..." : "✦ Generovat citát"}
        </button>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "13px", marginTop: "12px", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        )}

        {/* Generated quote box */}
        {quote && !loading && (
          <div style={{ marginTop: "20px", background: "#0f1117", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "10px", padding: "20px" }}>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "18px", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, margin: "0 0 16px" }}>
              „{quote}"
            </p>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: "11px", letterSpacing: "0.1em", color: "#c9a84c", margin: "0 0 16px" }}>
              — {philosopher.toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigator.clipboard.writeText(quote)}
                style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", padding: "8px 16px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer" }}
              >
                Kopírovat
              </button>
              <button
                onClick={generate}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "8px 16px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer" }}
              >
                Generovat znovu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sekce 2 — Náhled příspěvku */}
      {quote && !loading && (
        <div style={S.card}>
          <div style={S.sectionTitle}>NÁHLED PŘÍSPĚVKU</div>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <InstagramPreview quote={quote} philosopher={philosopher} />
            <div style={{ flex: 1, minWidth: "200px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: "12px" }}>
                Náhled ve formátu 1:1 pro Instagram.
              </p>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "Cinzel, serif", letterSpacing: "0.1em" }}>
                <div>Filosof: {philosopher}</div>
                <div style={{ marginTop: "4px" }}>Téma: {topic}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sekce 3 — Export / Publikace */}
      {quote && !loading && (
        <div style={S.card}>
          <div style={S.sectionTitle}>EXPORT / PUBLIKACE</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            {[
              { label: "⬇ Stáhnout jako PNG" },
              { label: "📷 Publikovat na Instagram" },
              { label: "🎵 Publikovat na TikTok" },
            ].map(btn => (
              <button
                key={btn.label}
                disabled
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.2)",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  cursor: "not-allowed",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif" }}>
            Publikace bude dostupná brzy.
          </p>
        </div>
      )}
    </>
  );
}

function DashboardSection() {
  const stats = [
    { label: "Registrovaní uživatelé", value: "—" },
    { label: "Aktivní předplatitelé", value: "—" },
    { label: "Zprávy dnes", value: "—" },
    { label: "Vygenerované citáty", value: "—" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.card, marginBottom: 0, textAlign: "center" as const }}>
            <div style={{ fontSize: "28px", fontFamily: "Cinzel, serif", color: "#c9a84c", marginBottom: "8px" }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sectionTitle}>PŘEHLED</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
          Statistiky budou dostupné po napojení na Supabase Analytics.
        </p>
      </div>
    </>
  );
}

function PlaceholderSection({ label }: { label: string }) {
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>{label.toUpperCase()}</div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
        Tato sekce bude dostupná brzy.
      </p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("generator");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
          className="lg-hidden"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: "240px",
        background: "#13151c",
        borderRight: "1px solid rgba(201,168,76,0.12)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "fixed" as const,
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}
        className="sidebar"
      >
        {/* Brand */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "13px", letterSpacing: "0.15em" }}>KLID V CHAOSU</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", marginTop: "3px", letterSpacing: "0.05em" }}>Admin panel</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "11px 20px",
                background: activeSection === item.id ? "rgba(201,168,76,0.08)" : "transparent",
                border: "none",
                borderLeft: activeSection === item.id ? "2px solid #c9a84c" : "2px solid transparent",
                color: activeSection === item.id ? "#c9a84c" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                fontSize: "13.5px",
                textAlign: "left",
                transition: "all 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => { if (activeSection !== item.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={e => { if (activeSection !== item.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
            >
              <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => router.push("/uvnitr")}
            style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
          >
            ← Zpět do appky
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", marginLeft: 0 }} className="main-content">
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "#13151c",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#c9a84c", fontSize: "20px", padding: "4px", lineHeight: 1 }}
          >
            ☰
          </button>
          <h1 style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "15px", letterSpacing: "0.12em", margin: 0, flex: 1 }}>
            {NAV.find(n => n.id === activeSection)?.label}
          </h1>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", display: "none" }} className="admin-email">
            heydomcreator@gmail.com
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 24px", maxWidth: "900px" }}>
          {activeSection === "generator" && <GeneratorSection />}
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "users" && <PlaceholderSection label="Uživatelé" />}
          {activeSection === "settings" && <PlaceholderSection label="Nastavení" />}
        </div>
      </main>

      <style>{`
        @media (min-width: 768px) {
          .sidebar { transform: translateX(0) !important; position: sticky !important; top: 0 !important; height: 100vh !important; }
          .main-content { margin-left: 0 !important; }
          .lg-hidden { display: none !important; }
          .admin-email { display: block !important; }
        }
        select option { background: #1a1d27; }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
