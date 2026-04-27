"use client";

import { useState } from "react";
import { FadeIn } from "@/components/public/FadeIn";
import { ParticleCanvas } from "@/components/public/ParticleCanvas";

interface FormState {
  name: string;
  email: string;
  type: string;
  message: string;
}

const initialForm: FormState = {
  name: "",
  email: "",
  type: "Neue Website",
  message: "",
};

const projektTypes = [
  "Neue Website",
  "Redesign",
  "Landing Page",
  "Consulting",
  "Anderes",
];

const inputClass =
  "w-full bg-[#F4F2ED] border border-black/[0.10] rounded-lg px-4 py-3 text-sm text-[#1C1C1E] focus:outline-none focus:border-[#7F77DD]/60 transition-colors placeholder:text-[#aaa]";

const labelClass =
  "block text-xs uppercase tracking-widest text-[#999] mb-1.5";

export default function KontaktPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitted(true);
  }

  function handleReset() {
    setForm(initialForm);
    setIsSubmitted(false);
  }

  return (
    <main className="flex flex-col md:flex-row" style={{ minHeight: "100dvh" }}>

      {/* ── Dark left half ──────────────────────────────────────────── */}
      <div className="relative bg-[#080808] md:w-[45%] flex flex-col justify-center px-8 md:px-14 pt-28 pb-16 md:py-24 overflow-hidden">
        <ParticleCanvas />

        {/* gradient overlays */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 25% 55%, rgba(127,119,221,0.07) 0%, transparent 70%)",
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

        <div className="relative z-10 flex flex-col gap-10 max-w-sm">
          {/* Heading */}
          <div>
            <FadeIn>
              <p
                className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-5"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Kontakt
              </p>
              <h1
                className="text-4xl md:text-5xl lg:text-[56px] font-semibold text-[#F5F5F0] leading-[1.1] tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Lass uns<br />sprechen.
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p
                className="mt-5 text-sm text-[#555] leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Beschreib mir kurz dein Projekt — ich antworte innerhalb von 48 Stunden
                und wir schauen, ob wir zusammenpassen.
              </p>
            </FadeIn>
          </div>

          {/* Contact details */}
          <FadeIn delay={0.18}>
            <ul className="flex flex-col gap-5">
              <li className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-[0.12em] text-[#444]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  E-Mail
                </span>
                <a
                  href="mailto:eric@schuck-webdesign.de"
                  className="text-sm text-[#F5F5F0] hover:text-[#7F77DD] transition-colors"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  eric@schuck-webdesign.de
                </a>
              </li>
              <li className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-[0.12em] text-[#444]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Standort
                </span>
                <span
                  className="text-sm text-[#666]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Deutschland
                </span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-[0.12em] text-[#444]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Antwortzeit
                </span>
                <span
                  className="text-sm text-[#666]"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Innerhalb von 48h
                </span>
              </li>
            </ul>
          </FadeIn>

          {/* Availability */}
          <FadeIn delay={0.26}>
            <div className="flex items-center gap-2.5 border-t border-white/[0.06] pt-8">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span
                className="text-xs text-[#555]"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Aktuell verfügbar für neue Projekte
              </span>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── Light right half ────────────────────────────────────────── */}
      <div
        data-cursor="dark"
        className="bg-[#F7F5F0] md:w-[55%] flex flex-col justify-center px-8 md:px-14 py-16 md:py-24"
      >
        <FadeIn delay={0.12}>
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-black/[0.05] max-w-lg w-full mx-auto">
            {isSubmitted ? (
              <div className="flex flex-col items-center text-center py-10 gap-5">
                <svg
                  className="w-12 h-12 text-[#7F77DD]"
                  fill="none"
                  viewBox="0 0 48 48"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle
                    cx="24" cy="24" r="22"
                    className="stroke-[#7F77DD]/20"
                    strokeWidth={2}
                    fill="none"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 24l7 7 13-13" />
                </svg>
                <h2
                  className="text-2xl font-semibold text-[#1C1C1E]"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Nachricht gesendet.
                </h2>
                <p
                  className="text-sm text-[#888] leading-relaxed max-w-xs"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Ich melde mich innerhalb von 48 Stunden bei dir.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-2 text-xs uppercase tracking-widest text-[#888] hover:text-[#1C1C1E] transition-colors border border-black/[0.10] rounded-lg px-5 py-2.5 cursor-pointer"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Zurück
                </button>
              </div>
            ) : (
              <>
                <h2
                  className="text-lg font-semibold text-[#1C1C1E] mb-6"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Projekt anfragen
                </h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <label htmlFor="name" className={labelClass} style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Name
                    </label>
                    <input
                      id="name" name="name" type="text" required
                      placeholder="Dein Name"
                      value={form.name} onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass} style={{ fontFamily: "var(--font-dm-sans)" }}>
                      E-Mail
                    </label>
                    <input
                      id="email" name="email" type="email" required
                      placeholder="deine@email.de"
                      value={form.email} onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className={labelClass} style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Projekt-Typ
                    </label>
                    <select
                      id="type" name="type"
                      value={form.type} onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {projektTypes.map((t) => (
                        <option key={t} value={t} className="bg-white">{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className={labelClass} style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Nachricht
                    </label>
                    <textarea
                      id="message" name="message" rows={5} required
                      placeholder="Erzähl mir von deinem Projekt..."
                      value={form.message} onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  <button
                    type="submit"
                    data-cursor="light"
                    className="w-full bg-[#1C1C1E] text-[#F5F5F0] py-3 rounded-lg font-semibold text-sm hover:bg-[#2a2a2a] transition-colors cursor-pointer mt-1"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Nachricht senden
                  </button>
                </form>

                <p
                  className="mt-5 text-xs text-[#bbb] text-center"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Kein Sales-Druck. Wenn es nicht passt, sage ich es direkt.
                </p>
              </>
            )}
          </div>
        </FadeIn>
      </div>

    </main>
  );
}
