"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Pattern = { name: string; label: string; phases: { label: string; duration: number }[] };

const patterns: Pattern[] = [
  {
    name: "Box",
    label: "4-4-4-4",
    phases: [
      { label: "NÁDECH", duration: 4 },
      { label: "ZADRŽET", duration: 4 },
      { label: "VÝDECH", duration: 4 },
      { label: "ZADRŽET", duration: 4 },
    ],
  },
  {
    name: "Klid",
    label: "4-7-8",
    phases: [
      { label: "NÁDECH", duration: 4 },
      { label: "ZADRŽET", duration: 7 },
      { label: "VÝDECH", duration: 8 },
    ],
  },
  {
    name: "Rovnováha",
    label: "6-6",
    phases: [
      { label: "NÁDECH", duration: 6 },
      { label: "VÝDECH", duration: 6 },
    ],
  },
];

export default function DychaniPage() {
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(patterns[0].phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(0);
  const countRef = useRef(patterns[0].phases[0].duration);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    phaseRef.current = 0;
    setPhaseIdx(0);
    countRef.current = patterns[selected].phases[0].duration;
    setCount(patterns[selected].phases[0].duration);
  }, [selected]);

  useEffect(() => {
    stop();
    setCycles(0);
  }, [selected, stop]);

  const start = () => {
    setRunning(true);
    setCycles(0);
    phaseRef.current = 0;
    setPhaseIdx(0);
    countRef.current = patterns[selected].phases[0].duration;
    setCount(patterns[selected].phases[0].duration);

    intervalRef.current = setInterval(() => {
      countRef.current -= 1;
      if (countRef.current <= 0) {
        const nextPhase = (phaseRef.current + 1) % patterns[selected].phases.length;
        if (nextPhase === 0) setCycles((c) => c + 1);
        phaseRef.current = nextPhase;
        setPhaseIdx(nextPhase);
        countRef.current = patterns[selected].phases[nextPhase].duration;
      }
      setCount(countRef.current);
    }, 1000);
  };

  const currentPhase = patterns[selected].phases[phaseIdx];
  const isInhale = currentPhase.label === "NÁDECH";
  const isExhale = currentPhase.label === "VÝDECH";
  const circleScale = running ? (isInhale ? 1.3 : isExhale ? 0.8 : 1.05) : 1;

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
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(10,10,26,0.9)" }} />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.15)", background: "rgba(10,10,26,0.7)", backdropFilter: "blur(10px)" }}
      >
        <Link href="/" className="text-xs opacity-40 hover:opacity-70 transition-opacity" style={{ color: "#FFD700", fontFamily: "Cinzel, serif" }}>
          ← Zpět
        </Link>
        <div className="flex-1 text-center">
          <div
            className="text-lg font-bold tracking-[0.2em]"
            style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
          >
            DÝCHÁNÍ
          </div>
          <div className="text-xs opacity-40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Stoické dechové cvičení
          </div>
        </div>
        <div className="w-16" />
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Pattern selector */}
        <div className="flex gap-3 mb-16">
          {patterns.map((p, i) => (
            <button
              key={p.name}
              onClick={() => !running && setSelected(i)}
              disabled={running}
              className="px-5 py-3 rounded-full transition-all duration-200 disabled:cursor-not-allowed"
              style={{
                fontFamily: "Cinzel, serif",
                background: selected === i ? "#FFD700" : "transparent",
                color: selected === i ? "#0a0a1a" : "#FFD700",
                border: "1px solid #FFD700",
                fontSize: "13px",
                letterSpacing: "0.05em",
                opacity: running && selected !== i ? 0.4 : 1,
              }}
            >
              <div>{p.name}</div>
              <div className="text-xs font-normal opacity-70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {p.label}
              </div>
            </button>
          ))}
        </div>

        {/* Phase labels above circle */}
        <div className="mb-8 h-6 flex items-center">
          <div
            className="text-xs tracking-widest opacity-50"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#FFD700" }}
          >
            {running
              ? patterns[selected].phases.map((p, i) => (
                  <span
                    key={p.label + i}
                    className="mx-2 transition-all duration-300"
                    style={{ opacity: i === phaseIdx ? 1 : 0.3, fontWeight: i === phaseIdx ? 600 : 400 }}
                  >
                    {p.label}
                  </span>
                ))
              : <span>Vyber cvičení a spusť</span>}
          </div>
        </div>

        {/* Big circle */}
        <div style={{ marginBottom: "48px" }}>
          <div
            className="rounded-full flex flex-col items-center justify-center"
            style={{
              width: "220px",
              height: "220px",
              border: "2px solid #FFD700",
              background: running
                ? isInhale
                  ? "rgba(255,215,0,0.08)"
                  : "rgba(255,215,0,0.03)"
                : "rgba(255,215,0,0.04)",
              boxShadow: running
                ? "0 0 60px rgba(255,215,0,0.25), inset 0 0 40px rgba(255,215,0,0.06)"
                : "0 0 20px rgba(255,215,0,0.1)",
              transform: `scale(${circleScale})`,
              transition: `transform ${currentPhase.duration * 0.9}s ease-in-out`,
            }}
          >
            <span
              className="text-xs tracking-widest mb-2"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700", opacity: 0.7 }}
            >
              {running ? currentPhase.label : "·  ·  ·"}
            </span>
            <span
              className="font-bold"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "64px", lineHeight: 1 }}
            >
              {running ? count : ""}
            </span>
          </div>
        </div>

        {/* Cycles counter */}
        <div className="mb-8 h-6">
          {running && cycles > 0 && (
            <p className="text-xs opacity-40 text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "#FFD700" }}>
              {cycles} {cycles === 1 ? "cyklus" : cycles < 5 ? "cykly" : "cyklů"} dokončeno
            </p>
          )}
        </div>

        {/* Start / Stop */}
        <button
          onClick={running ? stop : start}
          className="px-12 py-4 rounded-full font-semibold tracking-widest uppercase transition-all duration-200 hover:scale-105"
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "14px",
            background: running ? "transparent" : "#FFD700",
            color: running ? "#FFD700" : "#0a0a1a",
            border: "1px solid #FFD700",
          }}
        >
          {running ? "Zastavit" : "Spustit"}
        </button>

        {/* Tip */}
        <p
          className="mt-10 text-xs opacity-30 text-center max-w-xs"
          style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "14px" }}
        >
          "Ovládej dech a ovládáš mysl. Ovládáš mysl a ovládáš vše ostatní."
        </p>
      </div>
    </div>
  );
}
