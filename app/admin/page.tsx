"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Section = "dashboard" | "generator" | "users" | "settings" | "stories";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "generator", label: "Generátor obsahu", icon: "✦" },
  { id: "stories", label: "Příběhy", icon: "◈" },
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

// Sdílený typ a ikonky — používá PublishModal (čte připojené účty z DB)
type SocialAccount = {
  id: string;
  platform: string;
  account_name: string | null;
  zernio_account_id: string;
  is_active: boolean;
  created_at: string;
};

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📷", tiktok: "🎵", facebook: "f", youtube: "▶",
  twitter: "𝕏", bluesky: "🦋", linkedin: "in", pinterest: "𝗣", threads: "⊕",
};

// ─── Pomocné komponenty ────────────────────────────────────────────────────────

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

function TextField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...S.input, appearance: "auto" as const }} />
    </div>
  );
}

function InstagramPreview({ quote, philosopher, previewId }: { quote: string; philosopher: string; previewId?: string }) {
  return (
    <div style={{ maxWidth: "360px", width: "100%" }}>
      <div
        id={previewId}
        style={{ width: "100%", aspectRatio: "1/1", background: "linear-gradient(145deg, #0a0a1a 0%, #12081e 40%, #0d0a15 100%)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}
      >
        <div style={{ position: "absolute", top: "16px", left: "16px", width: "20px", height: "20px", borderTop: "1px solid rgba(201,168,76,0.3)", borderLeft: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", top: "16px", right: "16px", width: "20px", height: "20px", borderTop: "1px solid rgba(201,168,76,0.3)", borderRight: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", bottom: "56px", left: "16px", width: "20px", height: "20px", borderBottom: "1px solid rgba(201,168,76,0.3)", borderLeft: "1px solid rgba(201,168,76,0.3)" }} />
        <div style={{ position: "absolute", bottom: "56px", right: "16px", width: "20px", height: "20px", borderBottom: "1px solid rgba(201,168,76,0.3)", borderRight: "1px solid rgba(201,168,76,0.3)" }} />
        <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "18px", color: "rgba(255,255,255,0.92)", textAlign: "center", lineHeight: 1.6, margin: 0, flex: 1, display: "flex", alignItems: "center" }}>{quote}</p>
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

// ─── Publikační modal ──────────────────────────────────────────────────────────

function PublishModal({ quote, philosopher, onClose }: { quote: string; philosopher: string; onClose: () => void }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState(`${quote}\n\n— ${philosopher}\n\n#stoicismus #klidvchaosu #epiktetos`);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    supabase.from("social_accounts").select("*").eq("is_active", true)
      .then(({ data }) => {
        const list = (data as SocialAccount[]) || [];
        setAccounts(list);
        setSelectedIds(new Set(list.map(a => a.zernio_account_id)));
        setLoadingAccounts(false);
      });
  }, []);

  const toggleAccount = (zernioId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(zernioId)) next.delete(zernioId); else next.add(zernioId);
      return next;
    });
  };

  const handlePublish = async () => {
    if (selectedIds.size === 0) return;
    setPublishing(true);
    try {
      const el = document.getElementById("quote-preview");
      if (!el) throw new Error("Náhled nenalezen — zkus znovu.");
      const { default: html2canvas } = await import("html2canvas");
      const scale = 1080 / el.offsetWidth;
      const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: null });
      const imageBase64 = canvas.toDataURL("image/png").split(",")[1];

      const res = await fetch("/api/publish-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, caption, accountIds: [...selectedIds] }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(data.error || "Publikace selhala.");
      const okCount = (data.results as { ok: boolean }[]).filter(r => r.ok).length;
      const total = selectedIds.size;
      setResult({
        success: data.success,
        message: data.success
          ? `Publikováno na ${okCount} ${okCount === 1 ? "síť" : okCount < 5 ? "sítě" : "sítí"}.`
          : `${okCount} z ${total} ${total === 1 ? "sítě" : "sítí"} úspěšně. ${data.error ?? ""}`,
      });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Chyba při publikaci." });
    }
    setPublishing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#13151c", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "16px", padding: "32px", maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Hlavička */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "15px", letterSpacing: "0.12em" }}>PUBLIKOVAT PŘÍSPĚVEK</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        {/* Výběr sítí */}
        <div style={{ marginBottom: "20px" }}>
          <div style={S.label}>Vybrat sítě</div>
          {loadingAccounts ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>Načítám účty...</p>
          ) : accounts.length === 0 ? (
            <p style={{ color: "rgba(255,100,100,0.6)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>Žádné připojené účty. Sociální sítě se spravují v samostatné aplikaci.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {accounts.map(acct => {
                const selected = selectedIds.has(acct.zernio_account_id);
                return (
                  <label
                    key={acct.id}
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "10px 14px", background: selected ? "rgba(201,168,76,0.07)" : "#0f1117", border: `1px solid ${selected ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: "8px", transition: "all 0.15s" }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAccount(acct.zernio_account_id)}
                      style={{ width: "16px", height: "16px", accentColor: "#c9a84c", cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "18px", width: "22px", textAlign: "center" as const }}>{PLATFORM_ICON[acct.platform] ?? "⬡"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Cinzel, serif", color: selected ? "#c9a84c" : "rgba(255,255,255,0.45)", fontSize: "12px", letterSpacing: "0.05em" }}>
                        {acct.platform.charAt(0).toUpperCase() + acct.platform.slice(1)}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                        @{acct.account_name ?? acct.zernio_account_id}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Caption */}
        <div style={{ marginBottom: "24px" }}>
          <div style={S.label}>Caption</div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={6}
            style={{ ...S.input, resize: "vertical" as const, cursor: "text", appearance: "auto" as const, lineHeight: 1.6 }}
          />
        </div>

        {/* Výsledek */}
        {result && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: result.success ? "rgba(0,255,136,0.07)" : "rgba(255,100,100,0.07)", border: `1px solid ${result.success ? "rgba(0,255,136,0.2)" : "rgba(255,100,100,0.2)"}` }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: result.success ? "#00FF88" : "#ff6b6b", margin: 0 }}>
              {result.success ? "✓ " : "✗ "}{result.message}
            </p>
          </div>
        )}

        {/* Tlačítka */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handlePublish}
            disabled={publishing || selectedIds.size === 0 || result?.success === true}
            style={{
              flex: 1,
              background: (publishing || selectedIds.size === 0 || result?.success) ? "rgba(201,168,76,0.3)" : "#c9a84c",
              color: (publishing || selectedIds.size === 0 || result?.success) ? "rgba(0,0,0,0.4)" : "#0a0a1a",
              border: "none", padding: "13px 20px", borderRadius: "8px",
              fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "0.08em",
              cursor: (publishing || selectedIds.size === 0 || result?.success) ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {publishing ? "Publikuji..." : result?.success ? "✓ Hotovo" : "✦ Publikovat nyní"}
          </button>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "13px 20px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Generátor ────────────────────────────────────────────────────────────────

function GeneratorSection() {
  const [philosopher, setPhilosopher] = useState("Epiktétos");
  const [topic, setTopic] = useState("Klid");
  const [length, setLength] = useState("medium");
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const generate = async () => {
    setLoading(true); setError(""); setQuote("");
    try {
      const res = await fetch("/api/admin/generate-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ philosopher, topic, length }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote(data.quote);
    } catch { setError("Nepodařilo se vygenerovat citát. Zkus to znovu."); }
    finally { setLoading(false); }
  };

  const downloadPng = async () => {
    const el = document.getElementById("quote-preview");
    if (!el) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const scale = 1080 / el.offsetWidth;
      const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `quote_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {showPublishModal && (
        <PublishModal
          quote={quote}
          philosopher={philosopher}
          onClose={() => setShowPublishModal(false)}
        />
      )}

      <div style={S.card}>
        <div style={S.sectionTitle}>GENEROVÁNÍ CITÁTU</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <SelectField label="Filosof" value={philosopher} onChange={setPhilosopher} options={PHILOSOPHERS} />
          <SelectField label="Téma" value={topic} onChange={setTopic} options={TOPICS} />
          <SelectField label="Délka" value={length} onChange={setLength} options={LENGTHS} />
        </div>
        <button onClick={generate} disabled={loading} style={{ background: loading ? "rgba(201,168,76,0.3)" : "#c9a84c", color: loading ? "rgba(0,0,0,0.5)" : "#0a0a1a", border: "none", padding: "12px 28px", borderRadius: "8px", fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>
          {loading ? "Generuji..." : "✦ Generovat citát"}
        </button>
        {error && <p style={{ color: "#ff6b6b", fontSize: "13px", marginTop: "12px", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>}
        {quote && !loading && (
          <div style={{ marginTop: "20px", background: "#0f1117", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "10px", padding: "20px" }}>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "18px", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, margin: "0 0 16px" }}>„{quote}"</p>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: "11px", letterSpacing: "0.1em", color: "#c9a84c", margin: "0 0 16px" }}>— {philosopher.toUpperCase()}</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => navigator.clipboard.writeText(quote)} style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", padding: "8px 16px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer" }}>Kopírovat</button>
              <button onClick={generate} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "8px 16px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer" }}>Generovat znovu</button>
            </div>
          </div>
        )}
      </div>

      {quote && !loading && (
        <div style={S.card}>
          <div style={S.sectionTitle}>NÁHLED PŘÍSPĚVKU</div>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <InstagramPreview quote={quote} philosopher={philosopher} previewId="quote-preview" />
            <div style={{ flex: 1, minWidth: "200px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, marginBottom: "12px" }}>Náhled ve formátu 1:1 pro Instagram.</p>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "Cinzel, serif", letterSpacing: "0.1em" }}>
                <div>Filosof: {philosopher}</div>
                <div style={{ marginTop: "4px" }}>Téma: {topic}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {quote && !loading && (
        <div style={S.card}>
          <div style={S.sectionTitle}>EXPORT / PUBLIKACE</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={downloadPng}
              disabled={downloading}
              style={{ background: downloading ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", color: downloading ? "rgba(201,168,76,0.4)" : "#c9a84c", padding: "10px 18px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: downloading ? "not-allowed" : "pointer", transition: "all 0.15s" }}
            >
              {downloading ? "Generuji PNG..." : "⬇ Stáhnout jako PNG"}
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              style={{ background: "#c9a84c", color: "#0a0a1a", border: "none", padding: "10px 18px", borderRadius: "8px", fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "0.06em", cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}
            >
              ✦ Publikovat
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif", marginTop: "12px" }}>
            PNG se exportuje v rozlišení 1080×1080 px.
          </p>
        </div>
      )}
    </>
  );
}

// ─── Příběhy ──────────────────────────────────────────────────────────────────

// Adresa samostatné aplikace video-studio (Vite app, vlastní deployment).
// Přepiš přes NEXT_PUBLIC_VIDEO_STUDIO_URL (např. nasazená Vercel doména).
const VIDEO_STUDIO_URL = process.env.NEXT_PUBLIC_VIDEO_STUDIO_URL || "http://localhost:3000";

function StoriesSection() {
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>VIDEO STUDIO</div>
      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "44px", lineHeight: 1, flexShrink: 0 }}>🎬</div>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <p style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "15px", letterSpacing: "0.08em", margin: "0 0 6px" }}>
            Video studio
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
            Tvorba videí a carouselů — generování textů, obrázků, hlasu a render MP4.
            Otevře se v nové záložce.
          </p>
        </div>
        <a
          href={VIDEO_STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#c9a84c", color: "#0a0a1a", border: "none", padding: "12px 24px", borderRadius: "8px", fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "0.08em", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 }}
        >
          Otevřít studio →
        </a>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardSection() {
  const [storyCount, setStoryCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("stories").select("id", { count: "exact", head: true })
      .then(({ count }) => setStoryCount(count ?? 0));
  }, []);

  const stats = [
    { label: "Uživatelé", value: "—", sub: "Dostupné přes Supabase Auth" },
    { label: "Příběhy", value: storyCount !== null ? String(storyCount) : "...", sub: "Celkem v katalogu" },
    { label: "MRR", value: "—", sub: "Měsíční příjem" },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.card, marginBottom: 0, textAlign: "center" as const }}>
            <div style={{ fontSize: "38px", fontFamily: "Cinzel, serif", color: "#c9a84c", marginBottom: "6px", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px", fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif" }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sectionTitle}>RYCHLÝ PŘÍSTUP</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[{ label: "Přidat příběh →", section: "stories" }, { label: "Generovat citát →", section: "generator" }].map(btn => (
            <button
              key={btn.label}
              style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c", padding: "10px 18px", borderRadius: "8px", fontFamily: "Cinzel, serif", fontSize: "12px", letterSpacing: "0.06em", cursor: "pointer" }}
              onClick={() => document.dispatchEvent(new CustomEvent("admin-nav", { detail: btn.section }))}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function PlaceholderSection({ label }: { label: string }) {
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>{label.toUpperCase()}</div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>Tato sekce bude dostupná brzy.</p>
    </div>
  );
}

// ─── Uživatelé ────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  subscription: { label: string; state: "active" | "trial" | "expired"; status: string; daysLeft: number };
};

type UsersStats = { total: number; paying: number; trial: number; expired: number };

const SUB_BADGE: Record<AdminUser["subscription"]["state"], { bg: string; color: string; border: string }> = {
  active:  { bg: "rgba(0,255,136,0.1)",   color: "#00FF88",            border: "rgba(0,255,136,0.2)" },
  trial:   { bg: "rgba(201,168,76,0.1)",  color: "#c9a84c",            border: "rgba(201,168,76,0.25)" },
  expired: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.08)" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Nikdy";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Právě teď";
  if (mins < 60) return `Před ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Před ${days} dny`;
  return formatDate(iso);
}

function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users as AdminUser[]);
      setStats(data.stats as UsersStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se načíst uživatele.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const statCards = [
    { label: "Celkem", value: stats?.total },
    { label: "Platící", value: stats?.paying },
    { label: "Trial", value: stats?.trial },
    { label: "Vypršelo", value: stats?.expired },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...S.card, marginBottom: 0, textAlign: "center" as const }}>
            <div style={{ fontSize: "32px", fontFamily: "Cinzel, serif", color: "#c9a84c", marginBottom: "4px", lineHeight: 1 }}>
              {loading ? "..." : s.value ?? "—"}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "13px", letterSpacing: "0.12em" }}>
            SEZNAM UŽIVATELŮ{users.length > 0 ? ` (${users.length})` : ""}
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "6px 14px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Načítám..." : "↻ Obnovit"}
          </button>
        </div>

        {error ? (
          <p style={{ color: "#ff6b6b", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>{error}</p>
        ) : loading ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>Načítám uživatele...</p>
        ) : users.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>Zatím žádní uživatelé.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr>
                  {["Uživatel", "Registrace", "Poslední aktivita", "Předplatné"].map(h => (
                    <th key={h} style={{ textAlign: "left" as const, padding: "8px 12px", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase" as const }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const badge = SUB_BADGE[u.subscription.state];
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "13px" }}>{u.name}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "2px" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "12px", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.55)", fontSize: "12px", whiteSpace: "nowrap" as const }}>{formatDate(u.createdAt)}</td>
                      <td style={{ padding: "12px", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.55)", fontSize: "12px", whiteSpace: "nowrap" as const }}>{timeAgo(u.lastSignInAt)}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" as const }}>
                          {u.subscription.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Hlavní stránka ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setActiveSection((e as CustomEvent).detail as Section);
    document.addEventListener("admin-nav", handler);
    return () => document.removeEventListener("admin-nav", handler);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f1117", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} className="lg-hidden" />
      )}

      <aside style={{ width: "240px", background: "#13151e", borderRight: "0.5px solid rgba(201,168,76,0.2)", display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed" as const, top: 0, left: 0, bottom: 0, zIndex: 50, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease" }} className="sidebar">
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "18px", letterSpacing: "4px" }}>ADMIN</div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px", marginTop: "4px", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>Klid v Chaosu</div>
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "11px 20px", background: activeSection === item.id ? "rgba(201,168,76,0.08)" : "transparent", border: "none", borderLeft: activeSection === item.id ? "2px solid #c9a84c" : "2px solid transparent", color: activeSection === item.id ? "#c9a84c" : "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: "13.5px", textAlign: "left", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => { if (activeSection !== item.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={e => { if (activeSection !== item.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
            >
              <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

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

      <main style={{ flex: 1, overflow: "auto", marginLeft: 0 }} className="main-content">
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "16px", background: "#13151c", position: "sticky", top: 0, zIndex: 30 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c9a84c", fontSize: "20px", padding: "4px", lineHeight: 1 }}>☰</button>
          <h1 style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "15px", letterSpacing: "0.12em", margin: 0, flex: 1 }}>
            {NAV.find(n => n.id === activeSection)?.label}
          </h1>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", display: "none" }} className="admin-email">heydomcreator@gmail.com</span>
        </div>

        <div style={{ padding: "28px 24px", maxWidth: "900px" }}>
          {activeSection === "generator" && <GeneratorSection />}
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "stories" && <StoriesSection />}
          {activeSection === "users" && <UsersSection />}
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
