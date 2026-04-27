"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useMotionValue, useSpring, useMotionTemplate, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ParticleCanvas } from "@/components/public/ParticleCanvas";
import { FadeIn } from "@/components/public/FadeIn";

const EASE = [0.22, 1, 0.36, 1] as const;
const WORD_EASE = [0.22, 1, 0.36, 1] as const;

// ── Data ─────────────────────────────────────────────────────────────────────

const LOGOS = [
  "Unternehmen A",
  "Studio B",
  "Brand C",
  "Agentur D",
  "Firma E",
  "Projekt F",
];

const SERVICES = [
  {
    icon: "monitor",
    title: "Webdesign & UI/UX",
    desc: "Durchdachte Interfaces, die konvertieren. Von der ersten Wireframe-Idee bis zum finalen Design — nutzerzentriert und konversionsorientiert.",
    href: "/leistungen",
  },
  {
    icon: "code",
    title: "Development",
    desc: "Performante Umsetzung mit modernem Tech Stack. Next.js, React, TypeScript — blitzschnell, sauber und skalierbar.",
    href: "/leistungen",
  },
  {
    icon: "gauge",
    title: "Performance & SEO",
    desc: "100 PageSpeed. Technisch makellose Websites, die Google liebt und Nutzer begeistern — messbar und nachhaltig.",
    href: "/leistungen",
  },
];

const FEATURED_PROJECTS = [
  {
    slug: "projekt-alpha",
    name: "Projekt Alpha",
    category: "E-Commerce",
    desc: "Kompletter Relaunch eines Online-Shops mit neuem Branding und optimiertem Checkout.",
  },
  {
    slug: "projekt-beta",
    name: "Projekt Beta",
    category: "Corporate",
    desc: "Website-Relaunch für ein mittelständisches Unternehmen mit Fokus auf Lead-Generierung.",
  },
];

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Kennenlernen",
    desc: "Briefing, Zieldefinition, Budgetrahmen. Ich verstehe dein Business und deine Kunden.",
  },
  {
    num: "02",
    title: "Konzept",
    desc: "Sitemap, Wireframes, Styleguide. Der Plan steht, bevor eine Zeile Code geschrieben wird.",
  },
  {
    num: "03",
    title: "Umsetzung",
    desc: "Design und Entwicklung in enger Abstimmung. Wöchentliche Updates, keine Überraschungen.",
  },
  {
    num: "04",
    title: "Launch",
    desc: "Testing, Optimierung, Go-Live. Inklusive Einweisung und Support danach.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Die Zusammenarbeit war außergewöhnlich professionell. Das Ergebnis hat unsere Erwartungen bei weitem übertroffen. Unsere Conversion-Rate ist seit dem Launch signifikant gestiegen.",
    name: "Max Mustermann",
    company: "Unternehmen GmbH",
  },
  {
    quote:
      "Schnell, zuverlässig und mit einem Blick für Details. Genau das, was wir gesucht haben. Ich würde jederzeit wieder beauftragen.",
    name: "Anna Schmidt",
    company: "Studio ABC",
  },
  {
    quote:
      "Das beste Investment, das wir in diesem Jahr gemacht haben. Die Website spricht endlich die Sprache unserer Kunden.",
    name: "Thomas Klein",
    company: "Klein & Partner",
  },
];

// ── Micro-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-3"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {children}
    </p>
  );
}

function SectionHeadline({
  children,
  dark = true,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`text-3xl md:text-4xl lg:text-[42px] font-bold leading-tight tracking-tight ${
        dark ? "text-[#F5F5F0]" : "text-[#1C1C1E]"
      } ${className}`}
      style={{ fontFamily: "var(--font-fraunces)" }}
    >
      {children}
    </h2>
  );
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const increment = target / (1400 / 16);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

function SplitLine({
  words,
  startIndex,
  outline = false,
  inView,
}: {
  words: string[];
  startIndex: number;
  outline?: boolean;
  inView: boolean;
}) {
  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden"
          style={{ marginRight: "0.22em" }}
        >
          <motion.span
            className="inline-block"
            style={
              outline
                ? {
                    color: "var(--outline-fill, transparent)",
                    WebkitTextStroke: "1px #7F77DD",
                    fontStyle: "italic",
                  }
                : undefined
            }
            initial={{ y: "110%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : {}}
            transition={{
              delay: 0.05 + (startIndex + i) * 0.07,
              duration: 0.6,
              ease: WORD_EASE,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </>
  );
}

function SplitHeadline() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const line1 = "Websites,".split(" ");
  const line2 = "die verkaufen.".split(" ");
  const line2BlockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const block = line2BlockRef.current;
    if (!block) return;
    const onMove = (e: MouseEvent) => {
      const rect = block.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      const alpha = Math.max(0, 1 - dist / 160) * 0.18;
      block.style.setProperty("--outline-fill", `rgba(127,119,221,${alpha.toFixed(3)})`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <h1
      ref={ref}
      className="text-[clamp(48px,7vw,86px)] font-bold leading-[1.05] tracking-tight text-[#F5F5F0]"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      <span className="block">
        <SplitLine words={line1} startIndex={0} inView={inView} />
      </span>
      <span
        ref={line2BlockRef}
        className="block"
        style={{ ["--outline-fill" as string]: "transparent" }}
      >
        <SplitLine
          words={line2}
          startIndex={line1.length}
          outline
          inView={inView}
        />
      </span>
    </h1>
  );
}

function ServiceIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 text-[#7F77DD]";
  if (type === "monitor")
    return (
      <svg
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 21h8M12 17v4"
        />
      </svg>
    );
  if (type === "code")
    return (
      <svg
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    );
  return (
    <svg
      className={cls}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

const SPARKLE_DEFS = [
  { top: "12%",  left: "6%",  size: 3, dur: 4.4, dx: 12, dy: -9,  alpha: 0.55 },
  { top: "68%",  left: "11%", size: 2, dur: 5.9, dx: -8, dy: 11,  alpha: 0.38 },
  { top: "20%",  left: "89%", size: 4, dur: 3.8, dx: 9,  dy: 7,   alpha: 0.62 },
  { top: "64%",  left: "84%", size: 2, dur: 6.3, dx: -10, dy: -8, alpha: 0.40 },
  { top: "42%",  left: "97%", size: 3, dur: 4.9, dx: 7,  dy: -11, alpha: 0.50 },
];

function FloatingSparkles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SPARKLE_DEFS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: `rgba(180,174,255,${s.alpha})`,
            boxShadow: `0 0 ${s.size * 4}px ${s.size * 2}px rgba(127,119,221,${s.alpha * 0.45})`,
          }}
          animate={{
            x: [0, s.dx, 0, -s.dx * 0.6, 0],
            y: [0, s.dy * 0.5, s.dy, 0, 0],
            opacity: [s.alpha, s.alpha + 0.28, s.alpha * 0.65, s.alpha + 0.18, s.alpha],
            scale: [1, 1.45, 0.85, 1.25, 1],
          }}
          transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.65 }}
        />
      ))}
    </div>
  );
}

function MagneticLink({
  href,
  className,
  style,
  children,
  cursorDark = false,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  cursorDark?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.10);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.07);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} {...(cursorDark ? { "data-cursor": "dark" } : {})}>
      <motion.div style={{ x: sx, y: sy }}>
        <Link href={href} className={className} style={style}>{children}</Link>
      </motion.div>
    </div>
  );
}

function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);
  const smx = useSpring(mx, { stiffness: 180, damping: 28 });
  const smy = useSpring(my, { stiffness: 180, damping: 28 });
  const spotlight = useMotionTemplate`radial-gradient(300px circle at ${smx}px ${smy}px, rgba(127,119,221,0.075) 0%, transparent 70%)`;

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = sectionRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };
  const onLeave = () => {
    mx.set(-9999); my.set(-9999);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-[#080808]"
    >
      <ParticleCanvas />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(127,119,221,0.055) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: "50%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(127,119,221,0.06) 30%, rgba(127,119,221,0.06) 70%, transparent 100%)",
        }}
      />

      {/* Mouse spotlight */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{ background: spotlight }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 max-w-3xl mx-auto">
        <FloatingSparkles />
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Verfügbar für neue Projekte
          </span>
        </motion.div>

        <SplitHeadline />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
          className="text-sm text-[#666] leading-relaxed max-w-[340px]"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Performante Websites, die Leads generieren, Vertrauen aufbauen und
          dein Unternehmen wachsen lassen.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
          className="flex items-center gap-6 mt-1"
        >
          <MagneticLink
            href="/kontakt"
            cursorDark
            className="bg-[#F5F5F0] text-[#080808] px-6 py-2.5 rounded-md text-sm font-semibold hover:-translate-y-0.5 hover:bg-white transition-all duration-150"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Projekt starten
          </MagneticLink>
          <Link
            href="/projekte"
            className="ghost-link text-sm text-[#666] hover:text-[#F5F5F0] transition-colors duration-250"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Portfolio ansehen
            <span className="ghost-arrow" aria-hidden>→</span>
            <span className="ghost-underline" aria-hidden />
          </Link>
        </motion.div>
      </div>

      {/* Trust stats at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8 }}
        className="absolute bottom-10 left-0 right-0 z-10 flex justify-center"
      >
        <div className="flex items-center gap-10 md:gap-14 border-t border-white/[0.08] pt-6 px-4">
          {[
            { value: 40, suffix: "+", label: "Projekte" },
            { value: 100, suffix: "", label: "PageSpeed" },
            { value: 48, suffix: "h", label: "Reaktionszeit" },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span
                className="text-2xl font-bold text-[#F5F5F0] tabular-nums"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                <Counter target={value} suffix={suffix} />
              </span>
              <span
                className="text-[10px] text-[#555] uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function SocialProofSection() {
  const doubled = [...LOGOS, ...LOGOS];
  return (
    <div className="border-y border-white/[0.05] bg-[#0c0c0c] py-4 overflow-hidden relative z-0">
      <div
        className="flex items-center gap-12"
        style={{
          width: "max-content",
          animation: "marquee 30s linear infinite",
        }}
      >
        {doubled.map((name, i) => (
          <div key={i} className="flex items-center gap-3 flex-shrink-0">
            <div className="w-[90px] h-6 bg-white/[0.07] rounded" />
            <span
              className="text-xs text-white/20 sr-only"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProblemSolutionSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const cardX = useTransform(scrollYProgress, [0, 1], ["18%", "0%"]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  return (
    <section
      ref={sectionRef}
      data-cursor="dark"
      className="bg-[#F7F5F0] px-6 md:px-12 py-24 relative z-10 overflow-hidden"
      style={{ borderRadius: "56px 56px 0 0", marginTop: "-56px" }}
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
        <FadeIn>
          <div>
            <SectionLabel>Das Problem</SectionLabel>
            <SectionHeadline dark={false} className="mb-8">
              Die meisten Websites verschenken Umsatz.
            </SectionHeadline>
            <div className="flex flex-col gap-5">
              {[
                "Zu langsam geladen — Besucher springen ab, bevor sie ankommen.",
                "Kein klarer Call-to-Action — niemand weiß, was er tun soll.",
                "Veraltetes Design — Vertrauen wird zerstört bevor es entsteht.",
                "Nicht für Mobile optimiert — 60 % deiner Kunden kommen vom Handy.",
              ].map((pain) => (
                <div key={pain} className="flex items-start gap-3">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-[#aaa] flex-shrink-0" />
                  <p
                    className="text-sm text-[#666] leading-relaxed"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {pain}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <motion.div style={{ x: cardX, opacity: cardOpacity }}>
          <div data-cursor="light" className="bg-[#1C1C1E] rounded-2xl p-8 md:p-10">
            <SectionLabel>Die Lösung</SectionLabel>
            <h3
              className="text-2xl font-bold text-[#F5F5F0] mb-6 leading-snug tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Websites, die für dich verkaufen — rund um die Uhr.
            </h3>
            <div className="flex flex-col gap-5">
              {[
                {
                  title: "Conversion First",
                  desc: "Jedes Element hat einen Grund. Design folgt Strategie, nicht Geschmack.",
                },
                {
                  title: "100 PageSpeed",
                  desc: "Kein Bloat, kein Overhead. Technisch auf dem höchsten Stand.",
                },
                {
                  title: "Ergebnisorientiert",
                  desc: "Ich liefere keine Websites. Ich liefere messbares Wachstum.",
                },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#7F77DD] flex-shrink-0">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <div>
                    <p
                      className="text-sm font-semibold text-[#F5F5F0]"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {title}
                    </p>
                    <p
                      className="text-xs text-[#888] mt-0.5 leading-relaxed"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <SectionLabel>Leistungen</SectionLabel>
          <SectionHeadline dark={false} className="mb-14 max-w-md">
            Was ich für dich tue.
          </SectionHeadline>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.1}>
              <div data-cursor="light" className="group bg-[#1C1C1E] border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] hover:bg-[#222] transition-all duration-300 flex flex-col gap-5 h-full">
                <div className="w-10 h-10 rounded-lg bg-[#7F77DD]/10 border border-[#7F77DD]/20 flex items-center justify-center flex-shrink-0">
                  <ServiceIcon type={s.icon} />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-base font-semibold text-[#F5F5F0] mb-2"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-sm text-[#888] leading-relaxed"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {s.desc}
                  </p>
                </div>
                <Link
                  href={s.href}
                  className="text-sm text-[#7F77DD] hover:text-[#9B95E8] transition-colors flex items-center gap-1 mt-auto"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Mehr erfahren
                  <svg
                    className="w-3.5 h-3.5"
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
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section className="bg-[#0b0b0b] px-6 md:px-12 py-24">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <SectionLabel>Projekte</SectionLabel>
              <SectionHeadline>Ausgewählte Arbeiten.</SectionHeadline>
            </div>
            <Link
              href="/projekte"
              className="text-sm text-[#555] hover:text-[#F5F5F0] transition-colors flex-shrink-0 pb-1"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Alle Projekte ansehen →
            </Link>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-5">
          {FEATURED_PROJECTS.map((p, i) => (
            <FadeIn key={p.slug} delay={i * 0.1}>
              <Link href={`/projekte/${p.slug}`} className="group block">
                <div className="aspect-[4/3] bg-[#161616] rounded-xl border border-white/[0.06] mb-4 overflow-hidden group-hover:border-white/[0.12] transition-all duration-300 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span
                      className="text-[10px] uppercase tracking-[0.1em] text-[#7F77DD] bg-[#7F77DD]/10 px-2.5 py-1 rounded-full border border-[#7F77DD]/20"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {p.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 px-1">
                  <div>
                    <h3
                      className="text-base font-semibold text-[#F5F5F0] mb-1"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {p.name}
                    </h3>
                    <p
                      className="text-sm text-[#555]"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {p.desc}
                    </p>
                  </div>
                  <span className="text-[#444] group-hover:text-[#F5F5F0] transition-colors flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <SectionLabel>Prozess</SectionLabel>
          <SectionHeadline dark={false} className="mb-16 max-w-md">
            So arbeiten wir zusammen.
          </SectionHeadline>
        </FadeIn>

        <div className="grid md:grid-cols-4 gap-8 relative">
          <div
            className="hidden md:block absolute"
            style={{
              top: "20px",
              left: "calc(12.5% + 20px)",
              right: "calc(12.5% + 20px)",
              height: "1px",
              borderTop: "1px dashed rgba(28,28,30,0.15)",
            }}
          />
          {PROCESS_STEPS.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1}>
              <div>
                <div className="w-10 h-10 rounded-full border border-[#1C1C1E]/20 bg-[#F7F5F0] flex items-center justify-center mb-5 relative z-10">
                  <span
                    className="text-xs font-semibold text-[#1C1C1E]"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {step.num}
                  </span>
                </div>
                <h3
                  className="text-sm font-semibold text-[#1C1C1E] mb-2"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm text-[#888] leading-relaxed"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {step.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="bg-[#080808] px-6 md:px-12 py-24">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <SectionLabel>Stimmen</SectionLabel>
          <SectionHeadline className="mb-14 max-w-md">
            Was Kunden sagen.
          </SectionHeadline>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div className="bg-[#0f0f0f] border border-white/[0.07] rounded-xl p-7 flex flex-col gap-4 h-full">
                <span className="text-[38px] leading-none text-[#7F77DD]/25 font-serif select-none -mb-2">
                  "
                </span>
                <p
                  className="text-sm text-[#888] leading-relaxed flex-1"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {t.quote}
                </p>
                <div className="border-t border-white/[0.06] pt-4 mt-auto">
                  <p
                    className="text-sm font-semibold text-[#E8E8E4]"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="text-xs text-[#555] mt-0.5"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {t.company}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        <FadeIn>
          <div className="aspect-[3/4] bg-[#E2DDD5] rounded-2xl max-w-sm" />
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="flex flex-col gap-5">
            <div>
              <SectionLabel>Über mich</SectionLabel>
              <SectionHeadline dark={false} className="mb-5">
                Ich bin Eric. Webdesigner aus Leidenschaft.
              </SectionHeadline>
            </div>
            <p
              className="text-sm text-[#666] leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Platzhalter-Text. Hier steht deine persönliche Geschichte —
              warum du machst was du machst, was dich antreibt und was deine
              Kunden an dir schätzen. Authentisch, direkt und auf den Punkt.
            </p>
            <p
              className="text-sm text-[#666] leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Zweiter Absatz. Hintergrund, Werte, Arbeitsweise. Was du anders
              machst als die anderen.
            </p>
            <Link
              href="/ueber-mich"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:text-[#7F77DD] transition-colors mt-2"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Mehr über mich
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
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-[#080808] px-6 md:px-12 py-28 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(127,119,221,0.05) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-xl mx-auto text-center relative z-10">
        <FadeIn>
          <SectionLabel>Bereit?</SectionLabel>
          <SectionHeadline className="mb-5">
            Lass uns dein Projekt starten.
          </SectionHeadline>
          <p
            className="text-sm text-[#666] mb-8 leading-relaxed"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Kostenloses Erstgespräch — 30 Minuten, kein Druck, kein Pitch. Nur
            ein offenes Gespräch darüber, was du brauchst.
          </p>
          <Link
            href="/kontakt"
            data-cursor="dark"
            className="inline-flex items-center gap-2 bg-[#F5F5F0] text-[#080808] px-8 py-3.5 rounded-md text-sm font-semibold hover:-translate-y-0.5 hover:bg-white transition-all duration-150"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Kostenloses Erstgespräch
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
        </FadeIn>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <SocialProofSection />
      <ProblemSolutionSection />
      <ServicesSection />
      <ProjectsSection />
      <ProcessSection />
      <TestimonialsSection />
      <AboutSection />
      <FinalCtaSection />
    </main>
  );
}
