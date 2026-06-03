"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Story = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  duration_minutes: number | null;
  price_czk: number;
  trailer_youtube_id: string | null;
  full_youtube_id: string | null;
  thumbnail_url: string | null;
};

function PribehyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [youtubeModal, setYoutubeModal] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace("/prihlaseni"); return; }
      setUser({ name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "" });

      if (params.get("success") === "true") setShowSuccess(true);

      const [{ data: storiesData }, { data: purchasesData }] = await Promise.all([
        supabase
          .from("stories")
          .select("id, title, description, topic, duration_minutes, price_czk, trailer_youtube_id, full_youtube_id, thumbnail_url")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("story_purchases")
          .select("story_id")
          .eq("user_id", authUser.id),
      ]);

      setStories(storiesData || []);
      setPurchases(new Set((purchasesData || []).map((p: { story_id: string }) => p.story_id)));
      setLoading(false);
    };
    init();
  }, [router, params]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCheckout = async (storyId: string) => {
    setCheckoutLoading(storyId);
    try {
      const res = await fetch("/api/stripe/story-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      console.error("Story checkout error");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/rome.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(8,6,5,0.88)" }} />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ background: "rgba(8,6,5,0.6)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center cursor-pointer flex-shrink-0" onClick={() => router.push("/uvnitr")}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
              <Image src="/domu.png" alt="Domů" fill style={{ objectFit: "cover" }} />
            </div>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "2px", color: "#c9a84c", marginTop: "3px" }}>DOMŮ</span>
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "14px", letterSpacing: "0.15em" }}>STOICKÉ PŘÍBĚHY</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "10px", marginTop: "1px" }}>Skutečné příběhy. Jedno životní poučení.</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-xs hidden sm:block" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>{user.name}</span>}
          <button
            onClick={handleLogout}
            className="uppercase"
            style={{ fontFamily: "Cinzel, serif", fontSize: "12px", color: "#fff", background: "transparent", border: "1px solid rgba(240,237,232,0.5)", borderRadius: "6px", padding: "6px 14px", cursor: "pointer" }}
          >
            Odhlásit se
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 text-center pt-12 pb-8 px-4">
        <h1 style={{ fontFamily: "Cinzel, serif", fontSize: "clamp(22px, 5vw, 38px)", color: "#c9a84c", letterSpacing: "0.2em", marginBottom: "10px" }}>
          STOICKÉ PŘÍBĚHY
        </h1>
        <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.5)" }}>
          Skutečné příběhy. Jedno životní poučení.
        </p>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="relative z-10 flex justify-center mb-4 px-4">
          <div
            className="px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2"
            style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>✦</span>
            <span>Příběh odemčen — přehrát jej teď níže</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 pb-16 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div style={{ fontFamily: "Cinzel, serif", color: "rgba(201,168,76,0.4)", letterSpacing: "0.2em", fontSize: "12px" }}>NAČÍTÁM...</div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <div style={{ fontSize: "40px", marginBottom: "16px", color: "rgba(201,168,76,0.2)" }}>ᚠ</div>
            <p style={{ fontFamily: "Cinzel, serif", color: "rgba(201,168,76,0.4)", fontSize: "13px", letterSpacing: "0.15em" }}>
              PŘÍBĚHY SE PŘIPRAVUJÍ
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.25)", fontSize: "13px", marginTop: "8px" }}>
              Brzy zde najdeš první stoické příběhy.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map(story => {
              const owned = purchases.has(story.id);
              return (
                <div
                  key={story.id}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: "rgba(15,13,10,0.7)", border: "1px solid rgba(201,168,76,0.15)", backdropFilter: "blur(12px)" }}
                >
                  {/* Thumbnail */}
                  <div style={{ aspectRatio: "16/9", position: "relative", background: "linear-gradient(135deg, #0a0810, #150f1e)", overflow: "hidden", flexShrink: 0 }}>
                    {story.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.thumbnail_url} alt={story.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0810, #1a1028)" }}>
                        <span style={{ fontFamily: "Cinzel, serif", color: "rgba(201,168,76,0.2)", fontSize: "48px" }}>ᚠ</span>
                      </div>
                    )}
                    {/* Play overlay on thumbnail */}
                    {story.trailer_youtube_id && (
                      <button
                        onClick={() => setYoutubeModal(story.trailer_youtube_id!)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                        aria-label="Přehrát ukázku"
                      >
                        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(201,168,76,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#0a0a1a", fontSize: "18px", marginLeft: "3px" }}>▶</span>
                        </div>
                      </button>
                    )}
                    {/* Owned badge */}
                    {owned && (
                      <div
                        className="absolute top-3 right-3 px-2 py-1 rounded-full"
                        style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "0.08em" }}
                      >
                        ODEMČENO
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "15px", letterSpacing: "0.07em", marginBottom: "6px" }}>
                      {story.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      {story.topic && (
                        <span style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>{story.topic}</span>
                      )}
                      {story.topic && story.duration_minutes && (
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>·</span>
                      )}
                      {story.duration_minutes && (
                        <span style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>{story.duration_minutes} min</span>
                      )}
                    </div>
                    {story.description && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.6, marginBottom: "16px", flex: 1 }}>
                        {story.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap mt-auto">
                      {story.trailer_youtube_id && (
                        <button
                          onClick={() => setYoutubeModal(story.trailer_youtube_id!)}
                          style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", padding: "8px 14px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.6)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.25)"; }}
                        >
                          ▶ Ukázka
                        </button>
                      )}

                      <div style={{ flex: 1 }} />

                      {owned ? (
                        <button
                          onClick={() => story.full_youtube_id && setYoutubeModal(story.full_youtube_id)}
                          disabled={!story.full_youtube_id}
                          style={{
                            background: story.full_youtube_id ? "#c9a84c" : "rgba(201,168,76,0.2)",
                            color: story.full_youtube_id ? "#0a0a1a" : "rgba(201,168,76,0.4)",
                            padding: "9px 16px",
                            borderRadius: "8px",
                            fontFamily: "Cinzel, serif",
                            fontSize: "11px",
                            letterSpacing: "0.06em",
                            fontWeight: 700,
                            cursor: story.full_youtube_id ? "pointer" : "not-allowed",
                            border: "none",
                          }}
                        >
                          ▶ Přehrát příběh
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "17px", fontWeight: 700 }}>
                            {story.price_czk} Kč
                          </span>
                          <button
                            onClick={() => handleCheckout(story.id)}
                            disabled={checkoutLoading === story.id}
                            style={{
                              background: checkoutLoading === story.id ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.08)",
                              color: "#c9a84c",
                              padding: "9px 16px",
                              borderRadius: "8px",
                              fontFamily: "Cinzel, serif",
                              fontSize: "11px",
                              letterSpacing: "0.05em",
                              cursor: checkoutLoading === story.id ? "not-allowed" : "pointer",
                              border: "1px solid rgba(201,168,76,0.35)",
                              transition: "all 0.15s",
                            }}
                          >
                            {checkoutLoading === story.id ? "..." : "Odemknout příběh"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* YouTube modal */}
      {youtubeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(16px)" }}
          onClick={() => setYoutubeModal(null)}
        >
          <div
            className="w-full"
            style={{ maxWidth: "860px", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 0 60px rgba(201,168,76,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: "relative", paddingTop: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeModal}?autoplay=1`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <button
            onClick={() => setYoutubeModal(null)}
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.3)",
              color: "#c9a84c",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function PribehyPage() {
  return (
    <Suspense fallback={null}>
      <PribehyContent />
    </Suspense>
  );
}
