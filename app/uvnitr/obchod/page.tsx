"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function ObchodPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [toast, setToast] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", email: "", address: "", psc: "", city: "" });
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/prihlaseni"); return; }
      setUser({ name: user.user_metadata?.name || user.email?.split("@")[0] || "" });
      setReady(true);
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.email || !orderForm.address) return;
    setOrderLoading(true);
    setTimeout(() => {
      const orders = JSON.parse(localStorage.getItem("stoik_orders") || "[]");
      orders.push({ ...orderForm, date: new Date().toISOString(), product: "Stoická moudrost — tištěná edice" });
      localStorage.setItem("stoik_orders", JSON.stringify(orders));
      setShowModal(false);
      setOrderForm({ name: "", email: "", address: "", psc: "", city: "" });
      setOrderLoading(false);
      showToast("Předobjednávka přijata! Ozveme se na váš email.");
    }, 800);
  };

  if (!ready) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/rome.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(10,10,26,0.9)" }} />

      <header className="relative z-10 flex items-center justify-between px-5 py-4" style={{ background: "rgba(10,10,26,0.7)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,215,0,0.12)" }}>
        <div className="flex flex-col items-center cursor-pointer flex-shrink-0" onClick={() => router.push("/uvnitr")}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
            <Image src="/domu.png" alt="Domů" fill style={{ objectFit: "cover" }} />
          </div>
          <span style={{ fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "2px", color: "#c9a84c", marginTop: "3px" }}>DOMŮ</span>
        </div>
        <div className="text-center">
          <div className="text-base font-bold tracking-[0.2em]" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>OBCHOD</div>
          <div className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>Stoická literatura</div>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs hidden sm:block" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>{user.name}</span>}
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

      <main className="relative z-10 flex-1 overflow-y-auto px-5 py-8 pb-28 max-w-2xl mx-auto w-full">

        {/* Ebook */}
        <div
          className="p-6 rounded-2xl mb-5"
          style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-4xl">📱</div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", fontFamily: "Cinzel, serif", letterSpacing: "0.05em" }}
            >
              PŘIPRAVUJEME
            </span>
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>
            Stoická moudrost pro moderní svět
          </h3>
          <p className="text-sm mb-4 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
            Praktický průvodce stoicismem — od dichotomie kontroly po každodenní praxis. 120 stran, cvičení, citáty.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>149 Kč</span>
            <button
              onClick={() => showToast("Brzy dostupné!")}
              className="px-5 py-2.5 text-sm tracking-wider uppercase opacity-50 cursor-default rounded-lg"
              style={{ fontFamily: "Cinzel, serif", background: "rgba(255,215,0,0.1)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.2)", fontSize: "12px" }}
            >
              Upozornit mě
            </button>
          </div>
        </div>

        {/* Physical book */}
        <div
          className="p-6 rounded-2xl mb-5"
          style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.25)", boxShadow: "0 0 30px rgba(255,215,0,0.06)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-4xl">📚</div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700", fontFamily: "Cinzel, serif", letterSpacing: "0.05em", border: "1px solid rgba(255,215,0,0.4)" }}
            >
              PŘIJÍMÁME PŘEDOBJEDNÁVKY
            </span>
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>
            Stoická moudrost — tištěná edice
          </h3>
          <p className="text-sm mb-4 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
            Prémiová tištěná kniha v pevné vazbě. Zlatý tisk na obálce, kvalitní papír. Doručení poštou po celé ČR.
          </p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>349 Kč</span>
              <span className="text-xs ml-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>+ poštovné</span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 text-sm tracking-wider uppercase rounded-lg transition-all hover:scale-105"
              style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a", fontSize: "12px" }}
            >
              Předobjednat
            </button>
          </div>
          <p className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.45)" }}>
            Kniha je ve vývoji. Předobjednávky expedujeme jako první.
          </p>
        </div>
      </main>

      {/* Order modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d0d2b", border: "1px solid rgba(255,215,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 className="text-lg font-bold mb-1 text-center" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>Předobjednávka</h3>
            <p className="text-xs opacity-40 text-center mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>Stoická moudrost — tištěná edice</p>

            <form onSubmit={submitOrder} className="flex flex-col gap-3">
              {[
                { label: "Jméno a příjmení", key: "name", placeholder: "Jan Novák" },
                { label: "Email", key: "email", placeholder: "jan@email.cz" },
                { label: "Adresa (ulice a číslo)", key: "address", placeholder: "Korunní 12" },
                { label: "PSČ", key: "psc", placeholder: "120 00" },
                { label: "Město", key: "city", placeholder: "Praha" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs tracking-widest uppercase mb-1.5 opacity-50" style={{ fontFamily: "'DM Sans', sans-serif", color: "#FFD700" }}>{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={orderForm[f.key as keyof typeof orderForm]}
                    onChange={e => setOrderForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-lg outline-none text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,215,0,0.2)", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={orderLoading}
                className="w-full py-3.5 font-semibold tracking-widest uppercase text-sm mt-2 transition-all hover:scale-105 disabled:opacity-60"
                style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
              >
                {orderLoading ? "Odesíláme..." : "Odeslat předobjednávku"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="text-xs opacity-40 hover:opacity-60 transition-opacity text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Zrušit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-semibold"
          style={{ background: "#FFD700", color: "#0a0a1a", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(255,215,0,0.4)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
