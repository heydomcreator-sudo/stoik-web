"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,215,0,${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/rome.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(10,10,26,0.18)" }} />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.4 }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <span style={{ fontFamily: "Cinzel, serif", color: "#FFD700", fontSize: "14px", letterSpacing: "0.15em" }}>
          KLID V CHAOSU
        </span>
        <Link
          href="/prihlaseni"
          className="text-xs tracking-widest uppercase px-5 py-2.5 transition-all hover:opacity-80"
          style={{ fontFamily: "Cinzel, serif", color: "#FFD700", border: "1px solid rgba(255,215,0,0.4)" }}
        >
          Přihlásit se
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto w-full">
        <p
          className="text-xs tracking-[0.4em] uppercase mb-6 opacity-60"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#FFD700" }}
        >
          Stoická moudrost • Starověká moudrost
        </p>
        <h1
          className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          style={{ fontFamily: "Cinzel, serif", color: "#FFD700", letterSpacing: "0.05em" }}
        >
          KLID
          <br />
          <span style={{ color: "#fff" }}>V CHAOSU</span>
        </h1>
        <p
          className="text-lg md:text-xl mb-10 opacity-80 max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Moudrost starých pro klid dnešních.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/registrace"
            className="px-8 py-4 font-semibold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
            style={{ fontFamily: "Cinzel, serif", background: "#FFD700", color: "#0a0a1a" }}
          >
            Začít 7 dní zdarma
          </Link>
          <a
            href="#features"
            className="px-8 py-4 font-semibold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
            style={{ fontFamily: "Cinzel, serif", background: "transparent", color: "#FFD700", border: "1px solid #FFD700" }}
          >
            Více o appce
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 pb-10 flex flex-col items-center gap-2 opacity-40">
        <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "#FFD700" }}>
          Scroll
        </span>
        <div className="w-px h-12" style={{ background: "linear-gradient(to bottom, #FFD700, transparent)" }} />
      </div>
    </section>
  );
}
