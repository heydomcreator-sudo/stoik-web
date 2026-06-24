"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getUserSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription";

type Message = { role: "user" | "assistant"; content: string };

const PHILOSOPHERS = {
  epiktetos: { initial: "Ε", name: "EPIKTÉTOS", color: "#FFD700", portrait: "/portret_epictetus.png" },
  marcus: { initial: "M", name: "MARCUS AURELIUS", color: "#C0A050", portrait: "/portre_m_a.png" },
  seneca: { initial: "S", name: "SENECA", color: "#D4A850", portrait: "/portres_seneca.png" },
  marie: { initial: "M", name: "DR. MARIE", color: "#00FF88", portrait: null },
} as const;

type PhilKey = keyof typeof PHILOSOPHERS;

function getWeeklyPhilosopher(): PhilKey {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return (["epiktetos", "marcus", "seneca"] as PhilKey[])[weekNumber % 3];
}

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [philosopher, setPhilosopher] = useState<PhilKey>((params.get("phil") as PhilKey) || getWeeklyPhilosopher());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPhilPicker, setShowPhilPicker] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const phil = PHILOSOPHERS[philosopher];
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/prihlaseni"); return; }
      setUser({ name: user.user_metadata?.name || user.email?.split("@")[0] || "" });
      setIsAdmin(user.email === 'heydomcreator@gmail.com');

      const status = await getUserSubscriptionStatus(user.id, user.created_at)
      setSubscriptionStatus(status)
      if (!status.isActive) setShowPaywall(true)

      setMessages([{ role: "assistant", content: getGreeting(philosopher) }]);
    });
  }, [philosopher, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      console.error('Checkout error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      console.error('Portal error')
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function getGreeting(p: PhilKey) {
    const greetings: Record<PhilKey, string> = {
      epiktetos: "Co tě přivádí k filosofii? Neklid, nebo touha po moudrosti — obojí je dobrý začátek.",
      marcus: "Vítej, příteli. Sdílej se mnou, co tíží tvou mysl. Nadhled přichází s tichým srdcem.",
      seneca: "Píšu ti jako přítel příteli. Čas je jediné, co opravdu vlastníme — s čím mi dovolíš pomoci?",
      marie: "Dobrý den! Jsem tady, abychom společně hledali praktické odpovědi stoické moudrosti. Co vás trápí?",
    };
    return greetings[p];
  }

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!subscriptionStatus?.isActive) { setShowPaywall(true); return; }

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          philosopher,
        }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: text };
          return u;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Nemohu odpovědět. Zkus to znovu." }]);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = subscriptionStatus?.isTrial
    ? `Trial: ${subscriptionStatus.daysLeft} ${subscriptionStatus.daysLeft === 1 ? "den" : subscriptionStatus.daysLeft < 5 ? "dny" : "dní"}`
    : subscriptionStatus?.isActive
    ? "Premium aktivní"
    : "Trial vypršel";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/rome.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(10,10,26,0.88)" }} />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-3 px-5 py-3"
        style={{ background: "rgba(10,10,26,0.8)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,215,0,0.12)" }}
      >
        <div className="flex flex-col items-center cursor-pointer flex-shrink-0" onClick={() => router.push("/uvnitr")}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
            <Image src="/domu.png" alt="Domů" fill style={{ objectFit: "cover" }} />
          </div>
          <span style={{ fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "2px", color: "#c9a84c", marginTop: "3px" }}>DOMŮ</span>
        </div>
        <button onClick={() => setShowPhilPicker(true)} className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${phil.color}`, position: "relative" }}>
            {phil.portrait ? (
              <Image src={phil.portrait} alt={phil.name} fill style={{ objectFit: "cover" }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "#0a0a1a" }}>
                <span style={{ fontFamily: "Cinzel, serif", color: phil.color, fontSize: "14px", fontWeight: 700 }}>{phil.initial}</span>
              </div>
            )}
          </div>
          <div className="text-left">
            <div className="font-semibold text-xs tracking-widest" style={{ fontFamily: "Cinzel, serif", color: "#fff" }}>{phil.name}</div>
            <div className="text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00FF88" }} />
              <span style={{ color: "#00FF88", fontFamily: "'DM Sans', sans-serif", fontSize: "10px" }}>Přítomen</span>
            </div>
          </div>
          <span className="text-xs opacity-30" style={{ color: "#FFD700" }}>↕</span>
        </button>
        <div className="flex items-center gap-3 flex-shrink-0">
          {user && <span className="text-xs hidden sm:block" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>{user.name}</span>}
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              style={{ fontFamily: "Cinzel, serif", fontSize: "12px", letterSpacing: "1px", color: "#c9a84c", background: "transparent", border: "1px solid rgba(201,168,76,0.5)", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              ADMIN
            </button>
          )}
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

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 max-w-2xl mx-auto w-full pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1" style={{ border: `1px solid ${phil.color}`, position: "relative" }}>
                {phil.portrait ? (
                  <Image src={phil.portrait} alt={phil.name} fill style={{ objectFit: "cover" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "#0a0a1a" }}>
                    <span style={{ fontFamily: "Cinzel, serif", color: phil.color, fontSize: "11px" }}>{phil.initial}</span>
                  </div>
                )}
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { background: "#FFD700", color: "#0a0a1a", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,215,0,0.1)", fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "16px", color: "rgba(255,255,255,0.92)" }
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: `1px solid ${phil.color}`, position: "relative" }}>
              {phil.portrait ? (
                <Image src={phil.portrait} alt={phil.name} fill style={{ objectFit: "cover" }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "#0a0a1a" }}>
                  <span style={{ fontFamily: "Cinzel, serif", color: phil.color, fontSize: "11px" }}>{phil.initial}</span>
                </div>
              )}
            </div>
            <div className="px-5 py-4 rounded-2xl flex gap-1.5 items-center" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,215,0,0.1)" }}>
              {[0,1,2].map(d => (
                <span key={d} className="w-2 h-2 rounded-full inline-block" style={{ background: "#FFD700", animation: `bounce 1.2s ease-in-out ${d*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="relative z-10 px-4 py-3 max-w-2xl mx-auto w-full"
        style={{ background: "rgba(10,10,26,0.85)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,215,0,0.1)" }}
      >
        <div className="flex gap-3 items-center rounded-xl px-4 py-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.2)" }}>
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}
            placeholder="Napiš svou otázku..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
            style={{ background: "#FFD700" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="#0a0a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ fontFamily: "'DM Sans', sans-serif", color: subscriptionStatus?.isActive ? "rgba(255,255,255,0.35)" : "#ff6b6b" }}>
          {statusLabel}
        </p>
        {subscriptionStatus?.isActive && !subscriptionStatus?.isTrial && (
          <p className="text-center mt-1">
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,215,0,0.6)", background: "none", border: "none", cursor: portalLoading ? "not-allowed" : "pointer", textDecoration: "underline" }}
            >
              {portalLoading ? "Přesměrování..." : "Spravovat předplatné"}
            </button>
          </p>
        )}
      </div>

      {/* Philosopher picker */}
      {showPhilPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowPhilPicker(false)}>
          <div className="w-full max-w-md rounded-t-2xl p-6" style={{ background: "#0d0d2b", border: "1px solid rgba(255,215,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <p className="text-xs tracking-widest uppercase mb-4 text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>Vyber průvodce</p>
            {(Object.entries(PHILOSOPHERS) as [PhilKey, typeof PHILOSOPHERS[PhilKey]][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => { setPhilosopher(key); setShowPhilPicker(false); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl mb-2 transition-all hover:opacity-80"
                style={{ background: philosopher === key ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${philosopher === key ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"}` }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: `2px solid ${p.color}`, position: "relative" }}>
                  {p.portrait ? (
                    <Image src={p.portrait} alt={p.name} fill style={{ objectFit: "cover" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "#0a0a1a" }}>
                      <span style={{ fontFamily: "Cinzel, serif", color: p.color, fontSize: "14px" }}>{p.initial}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: "Cinzel, serif", color: p.color, fontSize: "13px" }}>{p.name}</span>
                {philosopher === key && <span className="ml-auto text-xs" style={{ color: "#FFD700" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(5,4,15,0.96)" }}>
          <div
            className="max-w-sm w-full p-8 rounded-2xl text-center"
            style={{
              background: "linear-gradient(145deg, #0d0a1e, #120f22)",
              border: "1px solid rgba(201,168,76,0.4)",
              boxShadow: "0 0 60px rgba(201,168,76,0.08), inset 0 0 40px rgba(201,168,76,0.03)",
            }}
          >
            {/* Icon */}
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", background: "rgba(201,168,76,0.06)" }}>
              <span style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "22px" }}>ᚠ</span>
            </div>

            <h2 style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "20px", letterSpacing: "0.1em", marginBottom: "10px" }}>
              TRIAL VYPRŠEL
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.55)", fontSize: "13px", marginBottom: "24px", lineHeight: 1.6 }}>
              Tvých 7 dní zdarma skončilo.<br />Pokračuj v rozhovorech s filozofy.
            </p>

            {/* Price */}
            <div style={{ marginBottom: "24px" }}>
              <span style={{ fontFamily: "Cinzel, serif", color: "#fff", fontSize: "36px", fontWeight: 700 }}>150 Kč</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginLeft: "6px" }}>/měsíc</span>
            </div>

            {/* Features */}
            <div style={{ marginBottom: "28px", textAlign: "left" }}>
              {["Neomezené rozhovory s filozofy", "Dechová cvičení", "Přístup ke všem budoucím funkcím"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ color: "#c9a84c", fontSize: "12px" }}>✦</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              style={{
                width: "100%",
                padding: "14px",
                background: checkoutLoading ? "rgba(201,168,76,0.4)" : "#c9a84c",
                color: checkoutLoading ? "rgba(0,0,0,0.4)" : "#0a0a1a",
                border: "none",
                borderRadius: "10px",
                fontFamily: "Cinzel, serif",
                fontSize: "13px",
                letterSpacing: "0.12em",
                fontWeight: 700,
                cursor: checkoutLoading ? "not-allowed" : "pointer",
                marginBottom: "12px",
                transition: "all 0.2s",
              }}
            >
              {checkoutLoading ? "Přesměrování..." : "PŘEDPLATIT — 150 KČ/MĚSÍC"}
            </button>

            {/* Dismiss only if still in trial */}
            {subscriptionStatus?.isTrial && (
              <button
                onClick={() => setShowPaywall(false)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}
              >
                Zavřít
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

export default function UvnitrChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}
