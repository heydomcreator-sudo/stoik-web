"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveUser, getUser } from "@/lib/auth";

export default function RegistracePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) router.replace("/uvnitr");
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Zadej své jméno.");
    if (!form.email.includes("@")) return setError("Zadej platný email.");
    if (form.password.length < 6) return setError("Heslo musí mít alespoň 6 znaků.");
    if (form.password !== form.confirm) return setError("Hesla se neshodují.");
    setLoading(true);
    setTimeout(() => {
      saveUser(form.name.trim(), form.email.trim().toLowerCase());
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
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ fontFamily: "Cinzel, serif", color: "#FFD700", letterSpacing: "0.1em" }}>
            ZAČÍT CESTU
          </h1>
          <p className="text-center text-xs mb-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>
            7 dní zdarma · 150 Kč/měsíc
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {[
              { label: "Jméno", key: "name", type: "text", placeholder: "Tvoje jméno" },
              { label: "Email", key: "email", type: "email", placeholder: "tvuj@email.cz" },
              { label: "Heslo", key: "password", type: "password", placeholder: "Alespoň 6 znaků" },
              { label: "Potvrdit heslo", key: "confirm", type: "password", placeholder: "Zopakuj heslo" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.6)" }}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm"
                  style={inputStyle}
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-center" style={{ color: "#ff6b6b", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-semibold tracking-widest uppercase text-sm mt-2 transition-all hover:scale-105 disabled:opacity-60"
              style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
            >
              {loading ? "Vytváříme účet..." : "Začít zdarma"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)" }}>
            Máš již účet?{" "}
            <Link href="/prihlaseni" className="underline hover:opacity-70 transition-opacity" style={{ color: "#FFD700" }}>
              Přihlásit se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
