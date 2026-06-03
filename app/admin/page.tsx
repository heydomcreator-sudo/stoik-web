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
const STORY_TOPICS = ["Memento mori", "Amor fati", "Dichotomie kontroly", "Virtue", "Klid v chaosu"];
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

function InstagramPreview({ quote, philosopher }: { quote: string; philosopher: string }) {
  return (
    <div style={{ maxWidth: "360px", width: "100%" }}>
      <div style={{ width: "100%", aspectRatio: "1/1", background: "linear-gradient(145deg, #0a0a1a 0%, #12081e 40%, #0d0a15 100%)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
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

function GeneratorSection() {
  const [philosopher, setPhilosopher] = useState("Epiktétos");
  const [topic, setTopic] = useState("Klid");
  const [length, setLength] = useState("medium");
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <>
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
            <InstagramPreview quote={quote} philosopher={philosopher} />
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
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            {["⬇ Stáhnout jako PNG", "📷 Publikovat na Instagram", "🎵 Publikovat na TikTok"].map(btn => (
              <button key={btn} disabled style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)", padding: "10px 18px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "not-allowed" }}>{btn}</button>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif" }}>Publikace bude dostupná brzy.</p>
        </div>
      )}
    </>
  );
}

type AdminStory = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  duration_minutes: number | null;
  price_czk: number;
  stripe_price_id: string | null;
  trailer_youtube_id: string | null;
  full_youtube_id: string | null;
  thumbnail_url: string | null;
  published: boolean;
  created_at: string;
};

const DEFAULT_FORM = { title: "", description: "", topic: "Memento mori", duration_minutes: "", price_czk: "49", stripe_price_id: "", trailer_youtube_id: "", full_youtube_id: "", thumbnail_url: "", published: false };

function StoriesSection() {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchStories = async () => {
    setListLoading(true);
    const { data } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
    setStories((data as AdminStory[]) || []);
    setListLoading(false);
  };

  useEffect(() => { fetchStories(); }, []);

  const handleEdit = (story: AdminStory) => {
    setEditId(story.id);
    setForm({
      title: story.title,
      description: story.description || "",
      topic: story.topic || "Memento mori",
      duration_minutes: story.duration_minutes?.toString() || "",
      price_czk: story.price_czk.toString(),
      stripe_price_id: story.stripe_price_id || "",
      trailer_youtube_id: story.trailer_youtube_id || "",
      full_youtube_id: story.full_youtube_id || "",
      thumbnail_url: story.thumbnail_url || "",
      published: story.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => { setEditId(null); setForm(DEFAULT_FORM); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("Název je povinný.");
    setFormLoading(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      topic: form.topic,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      price_czk: parseInt(form.price_czk) || 49,
      stripe_price_id: form.stripe_price_id.trim() || null,
      trailer_youtube_id: form.trailer_youtube_id.trim() || null,
      full_youtube_id: form.full_youtube_id.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      published: form.published,
    };

    const { error } = editId
      ? await supabase.from("stories").update(payload).eq("id", editId)
      : await supabase.from("stories").insert(payload);

    if (error) {
      showToast("Chyba: " + error.message);
    } else {
      showToast(editId ? "Příběh aktualizován!" : "Příběh přidán!");
      setEditId(null);
      setForm(DEFAULT_FORM);
      fetchStories();
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Smazat příběh "${title}"?`)) return;
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) showToast("Chyba při mazání: " + error.message);
    else { showToast("Příběh smazán."); fetchStories(); }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (v: string) => setForm(f => ({ ...f, [key]: v })),
  });

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#c9a84c", color: "#0a0a1a", padding: "10px 24px", borderRadius: "999px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Form */}
      <div style={S.card}>
        <div style={S.sectionTitle}>{editId ? "UPRAVIT PŘÍBĚH" : "PŘIDAT PŘÍBĚH"}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <TextField label="Název *" {...field("title")} placeholder="Název příběhu" />
            <SelectField label="Téma" value={form.topic} onChange={v => setForm(f => ({ ...f, topic: v }))} options={STORY_TOPICS} />
            <TextField label="Délka (minuty)" {...field("duration_minutes")} placeholder="15" type="number" />
            <TextField label="Cena (Kč)" {...field("price_czk")} placeholder="49" type="number" />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label style={S.label}>Popis</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Krátký popis příběhu..."
              rows={3}
              style={{ ...S.input, resize: "vertical" as const, cursor: "text", appearance: "auto" as const }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <TextField label="Trailer YouTube ID" {...field("trailer_youtube_id")} placeholder="dQw4w9WgXcQ" />
            <TextField label="Full video YouTube ID" {...field("full_youtube_id")} placeholder="dQw4w9WgXcQ" />
            <TextField label="Thumbnail URL" {...field("thumbnail_url")} placeholder="https://..." />
            <TextField label="Stripe Price ID (volitelné)" {...field("stripe_price_id")} placeholder="price_xxx" />
          </div>

          {/* Published toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <input
              type="checkbox"
              id="published"
              checked={form.published}
              onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#c9a84c" }}
            />
            <label htmlFor="published" style={{ ...S.label, marginBottom: 0, cursor: "pointer" }}>Publikovaný (viditelný uživatelům)</label>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              disabled={formLoading}
              style={{ background: formLoading ? "rgba(201,168,76,0.3)" : "#c9a84c", color: formLoading ? "rgba(0,0,0,0.5)" : "#0a0a1a", border: "none", padding: "12px 24px", borderRadius: "8px", fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "0.08em", cursor: formLoading ? "not-allowed" : "pointer", fontWeight: 600 }}
            >
              {formLoading ? "Ukládám..." : editId ? "Uložit změny" : "✦ Přidat příběh"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", padding: "12px 24px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}
              >
                Zrušit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Stories list */}
      <div style={S.card}>
        <div style={S.sectionTitle}>SEZNAM PŘÍBĚHŮ ({stories.length})</div>
        {listLoading ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>Načítám...</p>
        ) : stories.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>Zatím žádné příběhy.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr>
                  {["Název", "Téma", "Cena", "Status", "Akce"].map(h => (
                    <th key={h} style={{ textAlign: "left" as const, padding: "8px 12px", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase" as const }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stories.map(story => (
                  <tr key={story.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px", fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "13px" }}>{story.title}</td>
                    <td style={{ padding: "12px", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{story.topic || "—"}</td>
                    <td style={{ padding: "12px", fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "13px", whiteSpace: "nowrap" as const }}>{story.price_czk} Kč</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", background: story.published ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.06)", color: story.published ? "#00FF88" : "rgba(255,255,255,0.35)", border: `1px solid ${story.published ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                        {story.published ? "Publikováno" : "Skrytý"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEdit(story)}
                          style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "5px 12px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(story.id, story.title)}
                          style={{ background: "transparent", border: "1px solid rgba(255,100,100,0.2)", color: "rgba(255,100,100,0.6)", padding: "5px 12px", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", cursor: "pointer" }}
                        >
                          Smazat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

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
