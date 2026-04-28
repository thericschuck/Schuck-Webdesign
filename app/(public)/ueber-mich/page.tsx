"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { FadeIn } from "@/components/public/FadeIn";
import { ParticleCanvas } from "@/components/public/ParticleCanvas";

const stackGroups = [
  {
    label: "Design",
    tags: ["Figma", "Claude Design"],
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
    tags: ["Git", "VS Code", "Notion", "Google Analytics"],
  },
];

const values = [
  {
    title: "Ehrlichkeit",
    text: "Ich sage dir, was ich wirklich denke - auch wenn es unbequem ist. Keine leeren Versprechen, keine übertriebenen Erwartungen.",
  },
  {
    title: "Geschwindigkeit",
    text: "Schnelle Reaktionen, kurze Feedback-Zyklen, puenktliche Lieferungen. Deine Zeit ist genauso wertvoll wie meine.",
  },
  {
    title: "Qualität",
    text: "Ich liefere keine Websites von der Stange. Jedes Projekt bekommt die Aufmerksamkeit, die es verdient - im Design und im Code.",
  },
];

export default function UeberMichPage() {
  const valuesRef = useRef(null);
  const valuesInView = useInView(valuesRef, { once: true, margin: "-60px" });
  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-40px" });

  return (
    <main>
      <section className="relative bg-[#080808] pt-32 pb-24 px-6 md:px-12 overflow-hidden">
        <ParticleCanvas />

        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 50% 42%, rgba(127,119,221,0.06) 0%, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(0,0,0,0.52) 100%)",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[minmax(280px,380px)_1fr] gap-10 md:gap-16 items-center">
            <FadeIn>
              <div className="aspect-[3/4] rounded-[28px] border border-white/[0.08] max-w-sm w-full overflow-hidden relative">
                <Image
                  src="/profilbild.webp"
                  alt="Eric Schuck – Webdesigner"
                  fill
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover object-top"
                  priority
                />
                {/* subtle violet overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,119,221,0.12),transparent_50%)] pointer-events-none" />
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div
                className="rounded-[32px] px-6 py-6 md:px-8 md:py-8"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(3px) saturate(150%)",
                  WebkitBackdropFilter: "blur(3px) saturate(150%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow:
                    "0 10px 40px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex flex-col gap-6 pt-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-widest text-[#7F77DD]"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Über mich
                  </span>

                  <h1
                    className="text-4xl md:text-5xl lg:text-[58px] font-semibold leading-[1.06] text-[#F5F5F0]"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    Ich bin Eric.{" "}
                    <span className="italic">Webdesigner aus Überzeugung.</span>
                  </h1>

                  <p
                    className="text-sm text-[#8A8A8A] leading-relaxed max-w-xl"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Ich baue Websites, die nicht nur gut aussehen, sondern wirklich
                    funktionieren. Fuer mich ist Webdesign kein reines
                    Handwerk - es ist die Schnittstelle zwischen Aesthetik,
                    Psychologie und Technik. Jedes Projekt beginnt mit dem
                    Verständnis deines Unternehmens.
                  </p>
                  <p
                    className="text-sm text-[#8A8A8A] leading-relaxed max-w-xl"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Als Freelancer arbeite ich direkt mit dir zusammen - kein
                    Mittelmann, kein Agentur-Overhead. Du bekommst klare
                    Kommunikation, schnelle Umsetzung und ein Ergebnis, das zu
                    deiner Marke passt.
                  </p>

                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span
                      className="text-xs text-[#8A8A8A]"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Aktuell verfügbar für neue Projekte
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section
        data-cursor="dark"
        className="bg-[#F7F5F0] px-6 md:px-12 pt-[118px] pb-28 relative z-10"
        style={{
          borderRadius: "50% 50% 0 0 / 90px 90px 0 0",
          marginTop: "-90px",
        }}
      >
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

      <section
        ref={valuesRef}
        data-cursor="dark"
        className="bg-[#F7F5F0] px-6 md:px-12 pt-[118px] pb-24 relative z-10"
        style={{
          borderRadius: "0",
          marginTop: "-90px",
        }}
      >
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
              className="mt-4 mb-12 text-3xl md:text-4xl font-semibold text-[#1C1C1E]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Wie ich arbeite.
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {values.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                animate={valuesInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.18 + i * 0.12,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -5, transition: { duration: 0.22, ease: "easeOut" } }}
                className="group h-full"
              >
                <div className="bg-[#F1EEE7] border border-black/[0.06] rounded-xl p-7 h-full transition-colors duration-200 group-hover:border-[#7F77DD]/30 group-hover:bg-[#F4F0E8]">
                  <h3
                    className="text-base font-semibold text-[#1C1C1E] mb-3 transition-colors duration-200 group-hover:text-[#7F77DD]"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-sm text-[#5F5A52] leading-relaxed transition-colors duration-200 group-hover:text-[#4F4A43]"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {card.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section data-cursor="dark" className="bg-[#F7F5F0] px-4 md:px-6 pt-12 pb-0 -mt-6 md:-mt-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={ctaRef}
            data-cursor="light"
            initial={{ opacity: 0, y: 60 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#080808] rounded-t-3xl px-10 md:px-16 py-14 border border-white/[0.06] border-b-0 text-center overflow-hidden relative -mb-10 md:-mb-14"
            style={{ boxShadow: "0 8px 60px rgba(0,0,0,0.18)" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(127,119,221,0.08) 0%, transparent 72%)",
              }}
            />

            <div className="relative z-10">
              <p
                className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-3"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Kontakt
              </p>

              <h2
                className="text-3xl md:text-4xl lg:text-[42px] font-semibold text-[#F5F5F0] mb-4"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Lass uns zusammenarbeiten.
              </h2>

              <p
                className="text-sm text-[#8A8A8A] mb-8 max-w-md mx-auto leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Du hast ein Projekt im Kopf? Ich höre mir alles an -
                unverbindlich und ohne Verkaufsdruck. Schreib mir einfach.
              </p>

              <Link
                href="/kontakt"
                className="inline-block bg-[#F5F5F0] text-[#080808] px-8 py-3.5 rounded-md text-sm font-semibold hover:-translate-y-0.5 hover:bg-white transition-all duration-150"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
