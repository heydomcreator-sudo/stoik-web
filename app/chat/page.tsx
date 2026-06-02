"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Co tě přivádí k filosofii? Neklid, nebo touha po moudrosti — obojí je dobrý začátek.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLoggedIn] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;

    if (!isLoggedIn && msgCount >= 3) {
      setShowPaywall(true);
      return;
    }

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setMsgCount((c) => c + 1);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Nemohu odpovědět. Zkus to znovu." },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(10,10,26,0.88)" }} />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.15)", background: "rgba(10,10,26,0.7)", backdropFilter: "blur(10px)" }}
      >
        <Link href="/" className="text-xs opacity-40 hover:opacity-70 transition-opacity mr-2" style={{ color: "#FFD700", fontFamily: "Cinzel, serif" }}>
          ← Zpět
        </Link>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ border: "2px solid #FFD700", background: "#0a0a1a" }}
        >
          <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "16px", fontWeight: 700 }}>Ε</span>
        </div>
        <div>
          <div className="font-semibold text-sm tracking-widest" style={{ fontFamily: "Cinzel, serif", color: "#fff" }}>
            EPIKTÉTOS
          </div>
          <div className="text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00FF88" }} />
            <span style={{ color: "#00FF88", fontFamily: "'DM Sans', sans-serif" }}>Přítomen</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ border: "1px solid #FFD700", background: "#0a0a1a" }}
              >
                <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "12px" }}>Ε</span>
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { background: "#FFD700", color: "#0a0a1a", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }
                  : {
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,215,0,0.12)",
                      fontFamily: "'Crimson Pro', serif",
                      fontStyle: "italic",
                      fontSize: "16px",
                      color: "rgba(255,255,255,0.92)",
                    }
              }
            >
              {m.content || (loading && i === messages.length - 1 ? "" : m.content)}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: "1px solid #FFD700", background: "#0a0a1a" }}
            >
              <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "12px" }}>Ε</span>
            </div>
            <div
              className="px-5 py-4 rounded-2xl flex gap-1.5 items-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,215,0,0.12)" }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    background: "#FFD700",
                    animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="relative z-10 px-4 py-4 max-w-2xl mx-auto w-full"
        style={{ background: "rgba(10,10,26,0.8)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,215,0,0.1)" }}
      >
        <div
          className="flex gap-3 items-center rounded-xl px-4 py-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.2)" }}
        >
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}
            placeholder="Napiš svou otázku..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
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
        {!isLoggedIn && (
          <p className="text-center text-xs opacity-30 mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {3 - msgCount > 0 ? `${3 - msgCount} volné zprávy` : "Limit dosažen"}
          </p>
        )}
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(10,10,26,0.95)" }}>
          <div
            className="max-w-sm w-full p-8 rounded-2xl text-center"
            style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.3)" }}
          >
            <div className="text-3xl mb-4">🔒</div>
            <h2
              className="text-xl font-bold mb-3"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
            >
              Odemkni přístup
            </h2>
            <p className="text-sm opacity-70 mb-6 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Využil jsi 3 volné zprávy. Pokračuj v rozhovoru s Epiktétem za 199 Kč/měsíc.
              <br />
              <span className="text-green-400">7 dní zdarma.</span>
            </p>
            <Link
              href="#pricing"
              onClick={() => setShowPaywall(false)}
              className="block w-full py-4 font-semibold tracking-widest uppercase text-sm mb-3 transition-all hover:scale-105"
              style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
            >
              Začít zdarma
            </Link>
            <button
              onClick={() => setShowPaywall(false)}
              className="text-xs opacity-40 hover:opacity-60 transition-opacity"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
