"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/public/FadeIn";

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0 mt-0.5"
  >
    <circle cx="8" cy="8" r="7.5" stroke="#7F77DD" strokeOpacity="0.3" />
    <path
      d="M5 8L7 10L11 6"
      stroke="#7F77DD"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function ShootingStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let stars: { x: number; y: number; r: number; a: number }[] = [];
    let shootingStars: {
      x: number;
      y: number;
      angle: number;
      speed: number;
      length: number;
      width: number;
      life: number;
      decay: number;
      color: string;
    }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;

      stars = Array.from({ length: 55 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.22 + 0.04,
      }));
    };

    const spawnShootingStar = () => {
      if (Math.random() > 0.018) return;
      const fromTop = Math.random() < 0.7;
      const x = fromTop
        ? Math.random() * width * 1.2 - width * 0.1
        : -20;
      const y = fromTop ? -20 : Math.random() * height * 0.6;
      const angle = fromTop
        ? Math.PI / 4 + (Math.random() - 0.5) * 0.4
        : (Math.random() - 0.5) * 0.25;

      shootingStars.push({
        x,
        y,
        angle,
        speed: 3 + Math.random() * 2.2,
        length: 70 + Math.random() * 55,
        width: 1 + Math.random() * 0.7,
        life: 1,
        decay: 0.012 + Math.random() * 0.008,
        color: Math.random() < 0.35 ? "127,119,221" : "235,235,245",
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,200,230,${star.a})`;
        ctx.fill();
      }

      spawnShootingStar();
      shootingStars = shootingStars.filter((star) => star.life > 0);

      for (const star of shootingStars) {
        const dx = Math.cos(star.angle) * star.speed;
        const dy = Math.sin(star.angle) * star.speed;
        star.x += dx;
        star.y += dy;
        star.life -= star.decay;

        if (star.life <= 0) continue;

        const tailX = star.x - Math.cos(star.angle) * star.length;
        const tailY = star.y - Math.sin(star.angle) * star.length;
        const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
        gradient.addColorStop(0, `rgba(${star.color},0)`);
        gradient.addColorStop(0.6, `rgba(${star.color},${star.life * 0.12})`);
        gradient.addColorStop(1, `rgba(${star.color},${star.life * 0.7})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(star.x, star.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = star.width * star.life;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.width * 1.35 * star.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${star.life * 0.65})`;
        ctx.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />;
}

const services = [
  {
    id: "webdesign",
    title: "Webdesign & UI/UX",
    description:
      "Ich gestalte digitale Erlebnisse, die Nutzer überzeugen und zu Kunden machen. Vom ersten Wireframe bis zum finalen Design — durchdacht, modern und konversionsstark.",
    bullets: [
      "Nutzerzentriertes Design",
      "Conversion-optimierte Layouts",
      "Responsive für alle Geräte",
      "Figma Prototypen & Wireframes",
      "Animiertes Microinteraction-Design",
    ],
    theme: "dark",
    imageBg: "#1a1a1a",
    imageBorder: "rgba(255,255,255,0.05)",
    contentRight: false,
  },
  {
    id: "development",
    title: "Development",
    description:
      "Sauberer, performanter Code mit modernen Technologien. Ich entwickle Websites und Web-Apps, die schnell laden, sicher sind und technisch höchsten Standards entsprechen.",
    bullets: [
      "Next.js & React",
      "TypeScript",
      "Supabase & APIs",
      "Performance-optimiert (100 PageSpeed)",
      "SEO-technisch sauber",
    ],
    theme: "light",
    imageBg: "#E2DDD5",
    imageBorder: "rgba(28,28,30,0.08)",
    contentRight: true,
  },
  {
    id: "seo",
    title: "Performance & SEO",
    description:
      "Eine schöne Website bringt nichts, wenn sie niemand findet. Ich sorge dafür, dass dein Auftritt schnell ist, in Google rankt und technisch einwandfrei funktioniert.",
    bullets: [
      "Core Web Vitals Optimierung",
      "Technisches SEO Audit",
      "On-Page SEO",
      "Google Search Console Setup",
      "Ladezeit unter 1 Sekunde",
    ],
    theme: "dark",
    imageBg: "#1a1a1a",
    imageBorder: "rgba(255,255,255,0.05)",
    contentRight: false,
  },
] as const;

type Service = (typeof services)[number];

function ServiceBlock({ service, index }: { service: Service; index: number }) {
  const isDark = service.theme === "dark";
  const hasWaveTop = index > 0;
  const headlineColor = isDark ? "#F5F5F0" : "#1C1C1E";
  const descColor = isDark ? "#888" : "#555";
  const bulletColor = isDark ? "#aaa" : "#444";
  const labelColor = "#7F77DD";
  const iconBg = isDark
    ? "rgba(127,119,221,0.12)"
    : "rgba(127,119,221,0.1)";
  const iconBorder = "rgba(127,119,221,0.2)";

  const ContentBlock = (
    <div className="flex flex-col justify-center gap-6">
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: iconBg, border: `1px solid ${iconBorder}` }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="2"
            width="18"
            height="18"
            rx="4"
            stroke={labelColor}
            strokeWidth="1.5"
          />
          <path
            d="M7 11H15M11 7V15"
            stroke={labelColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Title */}
      <h2
        className="text-3xl font-normal leading-tight"
        style={{
          fontFamily: "var(--font-fraunces)",
          color: headlineColor,
        }}
      >
        {service.title}
      </h2>

      {/* Description */}
      <p
        className="text-base leading-relaxed"
        style={{ fontFamily: "var(--font-dm-sans)", color: descColor }}
      >
        {service.description}
      </p>

      {/* Bullet list */}
      <ul className="flex flex-col gap-2.5">
        {service.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <CheckIcon />
            <span
              className="text-sm leading-relaxed"
              style={{
                fontFamily: "var(--font-dm-sans)",
                color: bulletColor,
              }}
            >
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  const numColor = isDark ? "rgba(255,255,255,1.54)" : "rgba(0,0,0,0.155)";

  const NumberBlock = (
    <div
      aria-hidden
      className="relative w-full min-h-[180px] md:min-h-[320px] flex items-center justify-center overflow-visible"
    >
      <span
        className="leading-none select-none pointer-events-none"
        style={{
          fontFamily: "var(--font-fraunces)",
          fontSize: "clamp(150px, 28vw, 280px)",
          fontWeight: 700,
          color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          lineHeight: 1,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );

  return (
    <section
      style={{
        backgroundColor: isDark ? "#080808" : "#F7F5F0",
      }}
      className={`relative px-6 md:px-12 ${hasWaveTop ? "pt-32 md:pt-36 pb-20" : "py-20"}`}
    >
      {hasWaveTop ? (
        <div aria-hidden className="absolute top-0 left-0 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block h-[60px] md:h-[88px] w-full"
          >
            <path
              d="M0,0 L0,42 C130,78 280,86 430,64 C570,44 675,18 800,26 C940,36 1080,74 1220,68 C1310,64 1385,50 1440,40 L1440,0 Z"
              fill={isDark ? "#F7F5F0" : "#080808"}
            />
          </svg>
        </div>
      ) : null}

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {service.contentRight ? (
            <>
              <FadeIn delay={0.05}>{NumberBlock}</FadeIn>
              <FadeIn delay={0.12}>{ContentBlock}</FadeIn>
            </>
          ) : (
            <>
              <FadeIn delay={0.05}>{ContentBlock}</FadeIn>
              <FadeIn delay={0.12}>{NumberBlock}</FadeIn>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function LeistungenPage() {
  return (
    <main>
      {/* Page Header */}
      <section style={{ backgroundColor: "#080808" }} className="relative overflow-hidden pt-36 pb-20 px-6 md:px-12">
        <ShootingStarsBackground />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 32%, rgba(127,119,221,0.05) 0%, transparent 72%)",
          }}
        />
        <div className="max-w-6xl mx-auto">
          <FadeIn delay={0}>
            <span
              className="inline-block text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full mb-6"
              style={{
                color: "#7F77DD",
                backgroundColor: "rgba(127, 119, 221, 0.1)",
                border: "1px solid rgba(127, 119, 221, 0.2)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Leistungen
            </span>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-normal leading-tight mb-5"
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "#F5F5F0",
              }}
            >
              Was ich für dich tue.
            </h1>
          </FadeIn>
          <FadeIn delay={0.14}>
            <p
              className="text-base md:text-lg max-w-md"
              style={{ fontFamily: "var(--font-dm-sans)", color: "#666" }}
            >
              Von der Konzeption über das Design bis zur Live-Schaltung —
              alles aus einer Hand.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Service Blocks */}
      {services.map((service, i) => (
        <ServiceBlock key={service.id} service={service} index={i} />
      ))}

      {/* Final CTA */}
      <section style={{ backgroundColor: "#0b0b0b" }} className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn delay={0}>
            <h2
              className="text-4xl md:text-5xl font-normal mb-5"
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "#F5F5F0",
              }}
            >
              Bereit anzufangen?
            </h2>
          </FadeIn>
          <FadeIn delay={0.08}>
            <p
              className="text-base mb-8"
              style={{ fontFamily: "var(--font-dm-sans)", color: "#666" }}
            >
              Lass uns in einem kostenlosen Gespräch herausfinden, wie ich dein
              Projekt voranbringen kann.
            </p>
          </FadeIn>
          <FadeIn delay={0.14}>
            <Link
              href="/kontakt"
              className="inline-block px-7 py-3.5 rounded-full text-sm font-medium transition-opacity duration-200 hover:opacity-85"
              style={{
                backgroundColor: "#7F77DD",
                color: "#fff",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Kostenloses Erstgespräch buchen
            </Link>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
