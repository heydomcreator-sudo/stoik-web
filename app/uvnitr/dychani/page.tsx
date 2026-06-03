"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Pattern = { name: string; label: string; phases: { label: string; duration: number }[] };

const patterns: Pattern[] = [
  { name: "Box", label: "4-4-4-4", phases: [{ label: "NÁDECH", duration: 4 }, { label: "ZADRŽET", duration: 4 }, { label: "VÝDECH", duration: 4 }, { label: "ZADRŽET", duration: 4 }] },
  { name: "Klid", label: "4-7-8", phases: [{ label: "NÁDECH", duration: 4 }, { label: "ZADRŽET", duration: 7 }, { label: "VÝDECH", duration: 8 }] },
  { name: "Rovnováha", label: "6-6", phases: [{ label: "NÁDECH", duration: 6 }, { label: "VÝDECH", duration: 6 }] },
];

export default function UvnitrDychaniPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(patterns[0].phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(0);
  const countRef = useRef(patterns[0].phases[0].duration);

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

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    phaseRef.current = 0;
    setPhaseIdx(0);
    countRef.current = patterns[selected].phases[0].duration;
    setCount(patterns[selected].phases[0].duration);
  }, [selected]);

  useEffect(() => { stop(); setCycles(0); }, [selected, stop]);

  const start = () => {
    setRunning(true); setCycles(0);
    phaseRef.current = 0; setPhaseIdx(0);
    countRef.current = patterns[selected].phases[0].duration;
    setCount(patterns[selected].phases[0].duration);
    intervalRef.current = setInterval(() => {
      countRef.current -= 1;
      if (countRef.current <= 0) {
        const next = (phaseRef.current + 1) % patterns[selected].phases.length;
        if (next === 0) setCycles(c => c + 1);
        phaseRef.current = next; setPhaseIdx(next);
        countRef.current = patterns[selected].phases[next].duration;
      }
      setCount(countRef.current);
    }, 1000);
  };

  if (!ready) return null;

  const currentPhase = patterns[selected].phases[phaseIdx];
  const isInhale = currentPhase.label === "NÁDECH";
  const isExhale = currentPhase.label === "VÝDECH";
  const scale = running ? (isInhale ? 1.3 : isExhale ? 0.8 : 1.05) : 1;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/rome.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
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
          <div className="text-base font-bold tracking-[0.2em]" style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}>DÝCHÁNÍ</div>
          <div className="text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>Stoické dechové cvičení</div>
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

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 pb-24">
        <div className="flex gap-3 mb-12">
          {patterns.map((p, i) => (
            <button key={p.name} onClick={() => !running && setSelected(i)} disabled={running}
              className="px-4 py-2.5 rounded-full transition-all duration-200 disabled:cursor-not-allowed"
              style={{ fontFamily: "Cinzel, serif", background: selected === i ? "#FFD700" : "transparent", color: selected === i ? "#0a0a1a" : "#FFD700", border: "1px solid #FFD700", fontSize: "12px", opacity: running && selected !== i ? 0.3 : 1 }}
            >
              <div>{p.name}</div>
              <div className="text-xs font-normal" style={{ fontFamily: "'DM Sans', sans-serif", color: selected === i ? "#0a0a1a" : "#fff" }}>{p.label}</div>
            </button>
          ))}
        </div>

        <div className="mb-4 h-5 flex items-center justify-center">
          <div className="text-xs tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
            {running ? patterns[selected].phases.map((p, i) => (
              <span key={i} className="mx-2 transition-all duration-300" style={{ opacity: i === phaseIdx ? 1 : 0.35, fontWeight: i === phaseIdx ? 600 : 400 }}>{p.label}</span>
            )) : <span style={{ color: "rgba(255,255,255,0.5)" }}>Vyber cvičení a spusť</span>}
          </div>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <div
            className="rounded-full flex flex-col items-center justify-center"
            style={{ width: "200px", height: "200px", border: "2px solid #FFD700", background: running && isInhale ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.03)", boxShadow: running ? "0 0 60px rgba(255,215,0,0.2), inset 0 0 30px rgba(255,215,0,0.05)" : "0 0 20px rgba(255,215,0,0.08)", transform: `scale(${scale})`, transition: `transform ${currentPhase.duration * 0.9}s ease-in-out` }}
          >
            <span className="text-xs tracking-widest mb-2" style={{ fontFamily: "Cinzel, serif", color: "#FFD700", opacity: 0.7 }}>{running ? currentPhase.label : "· · ·"}</span>
            <span className="font-bold" style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "56px", lineHeight: 1 }}>{running ? count : ""}</span>
          </div>
        </div>

        <div className="mb-6 h-5">
          {running && cycles > 0 && (
            <p className="text-xs text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.5)" }}>
              {cycles} {cycles === 1 ? "cyklus" : cycles < 5 ? "cykly" : "cyklů"} dokončeno
            </p>
          )}
        </div>

        <button onClick={running ? stop : start}
          className="px-10 py-4 rounded-full font-semibold tracking-widest uppercase transition-all duration-200 hover:scale-105"
          style={{ fontFamily: "Cinzel, serif", fontSize: "13px", background: running ? "transparent" : "#FFD700", color: running ? "#FFD700" : "#0a0a1a", border: "1px solid #FFD700" }}
        >
          {running ? "Zastavit" : "Spustit"}
        </button>

        <p className="mt-8 text-xs text-center max-w-xs" style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
          &ldquo;Ovládej dech a ovládáš mysl.&rdquo;
        </p>
      </div>

    </div>
  );
}
