"use client";

import Link from "next/link";
import { FadeIn } from "@/components/public/FadeIn";

const stackGroups = [
  {
    label: "Design",
    tags: ["Figma", "Adobe XD", "Framer", "Prototyping"],
  },
  {
    label: "Development",
    tags: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Supabase",
      "Vercel",
      "Node.js",
    ],
  },
  {
    label: "Tools",
    tags: ["Git", "VS Code", "Linear", "Notion", "Google Analytics"],
  },
];

const values = [
  {
    title: "Ehrlichkeit",
    text: "Ich sage dir, was ich wirklich denke — auch wenn es unbequem ist. Keine leeren Versprechen, keine übertriebenen Erwartungen.",
  },
  {
    title: "Geschwindigkeit",
    text: "Schnelle Reaktionen, kurze Feedback-Zyklen, pünktliche Lieferungen. Deine Zeit ist genauso wertvoll wie meine.",
  },
  {
    title: "Qualität",
    text: "Ich liefere keine Websites von der Stange. Jedes Projekt bekommt die Aufmerksamkeit, die es verdient — im Design und im Code.",
  },
];

export default function UeberMichPage() {
  return (
    <main>
      {/* ── Hero / Intro ─────────────────────────────────────────── */}
      <section className="bg-[#080808] pt-36 pb-0 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start pb-20">
          {/* Left – photo placeholder */}
          <FadeIn>
            <div className="aspect-[3/4] bg-[#1a1a1a] rounded-2xl border border-white/[0.07] max-w-sm w-full" />
          </FadeIn>

          {/* Right – copy */}
          <FadeIn delay={0.15}>
            <div className="flex flex-col gap-6 pt-2">
              {/* Label */}
              <span
                className="text-xs font-semibold uppercase tracking-widest text-[#7F77DD]"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Über mich
              </span>

              {/* Headline */}
              <h1
                className="text-4xl md:text-5xl font-semibold leading-tight text-[#F5F5F0]"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Ich bin Eric.{" "}
                <span className="italic">Webdesigner aus Überzeugung.</span>
              </h1>

              {/* Body copy */}
              <p
                className="text-sm text-[#666] leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Ich baue Websites, die nicht nur gut aussehen, sondern wirklich
                funktionieren. Für mich ist Webdesign kein reines
                Handwerk — es ist die Schnittstelle zwischen Ästhetik,
                Psychologie und Technik. Jedes Projekt beginnt mit dem
                Verständnis deines Unternehmens.
              </p>
              <p
                className="text-sm text-[#666] leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Als Freelancer arbeite ich direkt mit dir zusammen — kein
                Mittelmann, kein Agentur-Overhead. Du bekommst klare
                Kommunikation, schnelle Umsetzung und ein Ergebnis, das zu
                deiner Marke passt.
              </p>

              {/* Availability badge */}
              <div className="flex items-center gap-2.5 mt-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span
                  className="text-xs text-[#666]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Aktuell verfügbar für neue Projekte
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stack & Tools ─────────────────────────────────────────── */}
      <section className="bg-[#F7F5F0] px-6 md:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <span
              className="text-xs font-semibold uppercase tracking-widest text-[#7F77DD]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Stack &amp; Tools
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h2
              className="mt-4 mb-12 text-3xl md:text-4xl font-semibold text-[#1C1C1E]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Womit ich arbeite.
            </h2>
          </FadeIn>

          <div className="flex flex-col gap-10">
            {stackGroups.map((group, i) => (
              <FadeIn key={group.label} delay={0.12 * (i + 1)}>
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest text-[#999] mb-3"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#1C1C1E]/[0.08] text-[#1C1C1E] text-xs px-3 py-1.5 rounded-full border border-[#1C1C1E]/[0.12] font-medium"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────── */}
      <section className="bg-[#080808] px-6 md:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <span
              className="text-xs font-semibold uppercase tracking-widest text-[#7F77DD]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Werte
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h2
              className="mt-4 mb-12 text-3xl md:text-4xl font-semibold text-[#F5F5F0]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Wie ich arbeite.
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {values.map((card, i) => (
              <FadeIn key={card.title} delay={0.12 * (i + 1)}>
                <div className="bg-[#0f0f0f] border border-white/[0.07] rounded-xl p-7 h-full">
                  <h3
                    className="text-base font-semibold text-[#F5F5F0] mb-3"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-sm text-[#666] leading-relaxed"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {card.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#F7F5F0] px-6 md:px-12 py-20 text-center">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2
              className="text-3xl md:text-4xl font-semibold text-[#1C1C1E] mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Lass uns zusammenarbeiten.
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p
              className="text-sm text-[#666] mb-8 max-w-md mx-auto leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Du hast ein Projekt im Kopf? Ich höre mir alles an —
              unverbindlich und ohne Verkaufsdruck. Schreib mir einfach.
            </p>
          </FadeIn>

          <FadeIn delay={0.18}>
            <Link
              href="/kontakt"
              className="inline-block bg-[#1C1C1E] text-[#F5F5F0] px-8 py-3.5 rounded-md text-sm font-semibold hover:bg-black transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Kontakt aufnehmen
            </Link>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
