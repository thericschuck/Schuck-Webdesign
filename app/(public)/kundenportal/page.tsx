"use client";

import Link from "next/link";
import { FadeIn } from "@/components/public/FadeIn";
import { ParticleCanvas } from "@/components/public/ParticleCanvas";

const STEPS = [
  {
    num: "01",
    title: "Einladung per E-Mail",
    desc: "Nach dem Projektstart erhältst du eine persönliche Einladung. Mit einem Klick richtest du deinen Zugang ein — kein technisches Wissen nötig.",
  },
  {
    num: "02",
    title: "Überblick über dein Projekt",
    desc: "Du siehst sofort, in welcher Phase sich dein Projekt befindet, welche Meilensteine erreicht wurden und was als Nächstes ansteht.",
  },
  {
    num: "03",
    title: "Austausch & Downloads",
    desc: "Lade Materialien hoch, lade fertige Dateien herunter und hinterlasse Feedback — alles an einem Ort, ohne E-Mail-Chaos.",
  },
];

const FEATURES = [
  {
    title: "Projektstatus",
    desc: "Live-Updates zu deinem Projekt — Meilensteine, aktuelle Phase und nächste Schritte immer im Blick.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    title: "Dokumente & Designs",
    desc: "Alle Lieferungen — Mockups, Verträge, Exportdateien — zentral gespeichert und jederzeit abrufbar.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    title: "Direkter Upload",
    desc: "Logos, Texte, Bilder — direkt ins Portal hochladen. Kein E-Mail-Chaos, kein verlorenes Feedback.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    title: "Passwort ändern",
    desc: "Deine Zugangsdaten jederzeit selbst verwalten — sicher und ohne Aufwand.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

export default function KundenportalPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative bg-[#080808] pt-36 pb-24 px-6 md:px-12 overflow-hidden">
        <ParticleCanvas />
        <div className="relative z-10 max-w-6xl mx-auto">
          <FadeIn>
            <span
              className="inline-block text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full mb-6"
              style={{
                color: "#7F77DD",
                backgroundColor: "rgba(127,119,221,0.1)",
                border: "1px solid rgba(127,119,221,0.2)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Kundenportal
            </span>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-normal leading-tight mb-6 max-w-2xl"
              style={{ fontFamily: "var(--font-fraunces)", color: "#F5F5F0" }}
            >
              Dein eigener Bereich. Immer up-to-date.
            </h1>
          </FadeIn>
          <FadeIn delay={0.14}>
            <p
              className="text-base md:text-lg max-w-md mb-8"
              style={{ fontFamily: "var(--font-dm-sans)", color: "#666" }}
            >
              Jeder Kunde bekommt Zugang zu einem persönlichen Portal — Projektstatus, Dokumente und direkter Austausch an einem Ort.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#F5F5F0] text-[#080808] px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-white transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Zum Portal
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Tutorial Video */}
      <section
        data-cursor="dark"
        className="bg-[#F7F5F0] px-6 md:px-12 pt-[118px] pb-24 relative z-10"
        style={{
          borderRadius: "50% 50% 0 0 / 90px 90px 0 0",
          marginTop: "-90px",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p
              className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-3"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Tutorial
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[#1C1C1E] mb-12 max-w-md"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              So funktioniert das Portal.
            </h2>
          </FadeIn>

          {/* Video placeholder */}
          <FadeIn delay={0.1}>
            <div
              className="relative w-full rounded-2xl overflow-hidden mb-16"
              style={{
                aspectRatio: "16/9",
                background: "#1C1C1E",
                border: "1px solid rgba(28,28,30,0.08)",
                boxShadow: "0 8px 48px rgba(0,0,0,0.1)",
              }}
            >
              {/* Coming soon overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center opacity-40"
                  style={{
                    background: "rgba(127,119,221,0.15)",
                    border: "1px solid rgba(127,119,221,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4.75L17.25 12 6 19.25V4.75Z" fill="#7F77DD" stroke="#7F77DD" strokeWidth={1.5} strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/70 mb-1" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Video in Bearbeitung
                  </p>
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Demnächst verfügbar
                  </p>
                </div>
              </div>
              <div className="absolute bottom-6 left-6">
                <p className="text-xs text-white/20 uppercase tracking-widest" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Tutorial · ca. 3 Minuten
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1}>
                <div className="flex flex-col gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "white", border: "1.5px solid rgba(28,28,30,0.12)" }}
                  >
                    <span
                      className="text-xs font-semibold text-[#1C1C1E]"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold text-[#1C1C1E] mb-1.5"
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
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="border-t border-black/[0.07] mb-14" />
          <FadeIn>
            <p
              className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-3"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Features
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[#1C1C1E] mb-12 max-w-md"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Was dich erwartet.
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div
                  className="flex gap-5 items-start p-6 rounded-2xl bg-white border border-black/5"
                  style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7F77DD]/10 border border-[#7F77DD]/20 flex items-center justify-center text-[#7F77DD] shrink-0 mt-0.5">
                    {f.icon}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold text-[#1C1C1E] mb-1"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {f.title}
                    </p>
                    <p
                      className="text-sm text-[#888] leading-relaxed"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#080808] px-6 py-20 text-center">
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <h2
              className="text-4xl font-normal text-[#F5F5F0] mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Bereits Kunde?
            </h2>
            <p
              className="text-sm text-[#666] mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Melde dich mit deinen Zugangsdaten an und greife direkt auf dein Projekt zu.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#F5F5F0] text-[#080808] px-7 py-3 rounded-md text-sm font-semibold hover:bg-white transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Zum Login
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
