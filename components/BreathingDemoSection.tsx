"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

export default function BreathingDemoSection() {
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(patterns[0].phases[0].duration);
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
  }, [selected, stop]);

  const start = () => {
    setRunning(true);
    phaseRef.current = 0;
    setPhaseIdx(0);
    countRef.current = patterns[selected].phases[0].duration;
    setCount(patterns[selected].phases[0].duration);

    intervalRef.current = setInterval(() => {
      countRef.current -= 1;
      if (countRef.current <= 0) {
        const nextPhase = (phaseRef.current + 1) % patterns[selected].phases.length;
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

  const circleScale = running
    ? isInhale ? 1.25 : isExhale ? 0.85 : 1.05
    : 1;

  return (
    <section className="py-24 px-6" style={{ background: "rgba(10,10,26,0.6)" }}>
      <div className="max-w-lg mx-auto text-center">
        <p
          className="text-xs tracking-[0.4em] uppercase mb-4 opacity-50"
          style={{ color: "#FFD700", fontFamily: "'DM Sans', sans-serif" }}
        >
          Zkus teď
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold mb-12"
          style={{ fontFamily: "Cinzel, serif", color: "#fff" }}
        >
          Stoické dýchání
        </h2>

        {/* Pattern selector */}
        <div className="flex justify-center gap-3 mb-12">
          {patterns.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setSelected(i)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                fontFamily: "Cinzel, serif",
                background: selected === i ? "#FFD700" : "transparent",
                color: selected === i ? "#0a0a1a" : "#FFD700",
                border: "1px solid #FFD700",
                letterSpacing: "0.05em",
              }}
            >
              {p.name}
              <span className="block text-xs opacity-70 font-normal" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Circle */}
        <div className="flex items-center justify-center mb-12" style={{ height: "240px" }}>
          <div
            className="rounded-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out"
            style={{
              width: "180px",
              height: "180px",
              border: "2px solid #FFD700",
              boxShadow: running ? "0 0 40px rgba(255,215,0,0.3), inset 0 0 30px rgba(255,215,0,0.05)" : "0 0 20px rgba(255,215,0,0.1)",
              transform: `scale(${circleScale})`,
              background: "rgba(255,215,0,0.04)",
            }}
          >
            <span
              className="text-xs tracking-widest opacity-70 mb-1"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700" }}
            >
              {running ? currentPhase.label : "PŘIPRAVEN"}
            </span>
            <span
              className="font-bold"
              style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "48px" }}
            >
              {running ? count : "·"}
            </span>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={running ? stop : start}
          className="px-10 py-4 font-semibold tracking-widest uppercase transition-all duration-200 hover:scale-105 rounded-full"
          style={{
            fontFamily: "Cinzel, serif",
            background: running ? "transparent" : "#FFD700",
            color: running ? "#FFD700" : "#0a0a1a",
            border: "1px solid #FFD700",
            fontSize: "14px",
          }}
        >
          {running ? "Zastavit" : "Spustit"}
        </button>
      </div>
    </section>
  );
}
