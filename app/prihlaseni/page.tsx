"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveUser, getUser } from "@/lib/auth";

export default function PrihlaseniPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) router.replace("/uvnitr");
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email.includes("@")) return setError("Zadej platný email.");
    if (form.password.length < 1) return setError("Zadej heslo.");
    setLoading(true);
    setTimeout(() => {
      const name = form.email.split("@")[0];
      saveUser(name, form.email.trim().toLowerCase());
      router.push("/uvnitr");
    }, 600);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,215,0,0.2)",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/rome.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="fixed inset-0" style={{ background: "rgba(10,10,26,0.88)" }} />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="block text-center mb-8 hover:opacity-80 transition-opacity text-xs tracking-widest uppercase" style={{ fontFamily: "Cinzel, serif", color: "rgba(255,215,0,0.5)" }}>
          ← Zpět na hlavní stránku
        </Link>

        <div className="p-8 md:p-10 rounded-2xl" style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.2)" }}>
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ fontFamily: "Cinzel, serif", color: "#FFD700", letterSpacing: "0.08em" }}>
            NÁVRAT K MOUDROSTI
          </h1>
          <p className="text-center text-xs mb-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>
            Pokračuj tam, kde jsi skončil
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.6)" }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tvuj@email.cz"
                className="w-full px-4 py-3 rounded-lg outline-none text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.6)" }}>Heslo</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Tvoje heslo"
                className="w-full px-4 py-3 rounded-lg outline-none text-sm"
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: "#ff6b6b", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-semibold tracking-widest uppercase text-sm mt-2 transition-all hover:scale-105 disabled:opacity-60"
              style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
            >
              {loading ? "Přihlašujeme..." : "Přihlásit se"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>
            Nemáš účet?{" "}
            <Link href="/registrace" className="underline hover:opacity-70 transition-opacity" style={{ color: "#FFD700" }}>
              Začít zdarma
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
