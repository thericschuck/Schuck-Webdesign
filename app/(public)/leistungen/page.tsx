"use client";

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

function ServiceBlock({ service }: { service: Service }) {
  const isDark = service.theme === "dark";
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

  const ImageBlock = (
    <div
      className="aspect-video md:aspect-square w-full rounded-2xl"
      style={{
        backgroundColor: service.imageBg,
        border: `1px solid ${service.imageBorder}`,
      }}
    />
  );

  return (
    <section
      style={{
        backgroundColor: isDark ? "#080808" : "#F7F5F0",
      }}
      className="py-20 px-6 md:px-12"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {service.contentRight ? (
            <>
              <FadeIn delay={0.05}>{ImageBlock}</FadeIn>
              <FadeIn delay={0.12}>{ContentBlock}</FadeIn>
            </>
          ) : (
            <>
              <FadeIn delay={0.05}>{ContentBlock}</FadeIn>
              <FadeIn delay={0.12}>{ImageBlock}</FadeIn>
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
      <section style={{ backgroundColor: "#080808" }} className="pt-36 pb-20 px-6 md:px-12">
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
      {services.map((service) => (
        <ServiceBlock key={service.id} service={service} />
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
