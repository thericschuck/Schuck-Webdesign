"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import Link from "next/link";

// ─── Browser Mockup with 3D Tilt ───────────────────────────────────────────

function BrowserMockup() {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useSpring(0, { stiffness: 120, damping: 20 });
  const rawY = useSpring(0, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(rawY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(rawX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      rawX.set(x);
      rawY.set(y);
    };

    const handleMouseLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [rawX, rawY]);

  return (
    <div ref={ref} className="relative w-full max-w-[520px] cursor-default select-none">
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
        className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
      >
        {/* Title bar */}
        <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-white/10">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <div className="ml-4 flex-1 bg-[#2a2a2a] rounded-md px-3 py-1 text-xs text-white/30 font-mono">
            schuck-webdesign.de
          </div>
        </div>

        {/* Page content mockup */}
        <div className="bg-[#111111] p-6 min-h-[320px] flex flex-col gap-5">
          {/* Nav */}
          <div className="flex items-center justify-between">
            <div className="w-20 h-3 rounded-full bg-white/20" />
            <div className="flex gap-4">
              <div className="w-12 h-2 rounded-full bg-white/10" />
              <div className="w-12 h-2 rounded-full bg-white/10" />
              <div className="w-16 h-6 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Hero text lines */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="w-4/5 h-5 rounded-full bg-white/25" />
            <div className="w-3/5 h-5 rounded-full bg-white/25" />
            <div className="w-4/5 h-3 rounded-full bg-white/10 mt-2" />
            <div className="w-3/4 h-3 rounded-full bg-white/10" />
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 mt-2">
            <div className="w-28 h-9 rounded-lg bg-white/30" />
            <div className="w-28 h-9 rounded-lg border border-white/20" />
          </div>

          {/* Cards row */}
          <div className="mt-auto grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2"
              >
                <div className="w-full h-16 rounded-lg bg-white/10" />
                <div className="w-4/5 h-2 rounded-full bg-white/15" />
                <div className="w-3/5 h-2 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Reflection overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-2xl" />
      </motion.div>

      {/* Glow */}
      <div className="absolute -inset-8 -z-10 bg-white/5 blur-3xl rounded-full" />
    </div>
  );
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// ─── Fade-in wrapper ────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-24 pb-16">
        {/* Subtle grid background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial glow top-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 w-[600px] h-[600px] -translate-x-1/3 -translate-y-1/3 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-7xl mx-auto w-full">
          {/* ── Left: Text ── */}
          <div className="flex-1 flex flex-col gap-6 max-w-xl">
            {/* Badge */}
            <FadeIn delay={0}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-sm text-white/60 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Aktuell verfügbar für neue Projekte
              </span>
            </FadeIn>

            {/* Headline */}
            <FadeIn delay={0.1}>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Websites,{" "}
                <span className="italic text-white/70">die verkaufen.</span>
                <br />
                Nicht nur existieren.
              </h1>
            </FadeIn>

            {/* Subtext */}
            <FadeIn delay={0.2}>
              <p
                className="text-base sm:text-lg text-white/50 leading-relaxed max-w-md"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Wir bauen performante Websites, die Leads generieren, Vertrauen
                aufbauen und dein Unternehmen wachsen lassen — nicht nur gut
                aussehen.
              </p>
            </FadeIn>

            {/* CTAs */}
            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Projekt starten
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>

                <Link
                  href="/work"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Arbeit ansehen
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: Browser Mockup ── */}
          <FadeIn delay={0.25} y={32} className="flex-1 flex justify-center lg:justify-end w-full">
            <BrowserMockup />
          </FadeIn>
        </div>

        {/* ── Stats row ── */}
        <div className="relative z-10 max-w-7xl mx-auto w-full mt-16 lg:mt-20">
          <FadeIn delay={0.4}>
            <div className="border-t border-white/10 pt-10 grid grid-cols-3 gap-8 max-w-lg">
              {[
                { value: 40, suffix: "+", label: "Projekte umgesetzt" },
                { value: 98, suffix: "%", label: "Kundenzufriedenheit" },
                { value: 3, suffix: "×", label: "Mehr Leads im Schnitt" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <span
                    className="text-3xl sm:text-4xl font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    <Counter target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span
                    className="text-xs sm:text-sm text-white/40 leading-tight"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-px h-8 bg-white/50"
          />
        </div>
      </section>
    </main>
  );
}
