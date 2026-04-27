"use client";

import { useState } from "react";
import { FadeIn } from "@/components/public/FadeIn";

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
  "w-full bg-[#0f0f0f] border border-white/[0.09] rounded-lg px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#7F77DD]/50 transition-colors placeholder:text-[#444]";

const labelClass =
  "block text-xs uppercase tracking-widest text-[#555] mb-1.5";

export default function KontaktPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
    <main>
      {/* ── Page Header ───────────────────────────────────────────── */}
      <section className="bg-[#080808] pt-36 pb-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <span
              className="text-xs font-semibold uppercase tracking-widest text-[#7F77DD]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Kontakt
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1
              className="mt-4 text-4xl md:text-5xl font-semibold text-[#F5F5F0] leading-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Lass uns sprechen.
            </h1>
          </FadeIn>

          <FadeIn delay={0.18}>
            <p
              className="mt-4 text-sm text-[#666] leading-relaxed max-w-lg"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Beschreib mir kurz dein Projekt — ich antworte innerhalb von 48
              Stunden und wir schauen gemeinsam, ob und wie ich helfen kann.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <section className="bg-[#080808] pb-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-16 items-start">
          {/* ── LEFT: Form / Success ──────────────────────────── */}
          <div className="md:col-span-3">
            {isSubmitted ? (
              <FadeIn>
                <div className="flex flex-col items-center text-center py-16 gap-5">
                  {/* Checkmark */}
                  <svg
                    className="w-12 h-12 text-[#7F77DD]"
                    fill="none"
                    viewBox="0 0 48 48"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      className="stroke-[#7F77DD]/20"
                      strokeWidth={2}
                      fill="none"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 24l7 7 13-13"
                    />
                  </svg>

                  <h2
                    className="text-2xl font-semibold text-[#F5F5F0]"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    Nachricht gesendet.
                  </h2>
                  <p
                    className="text-sm text-[#666] leading-relaxed max-w-xs"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Ich melde mich innerhalb von 48 Stunden bei dir.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-4 text-xs uppercase tracking-widest text-[#555] hover:text-[#F5F5F0] transition-colors border border-white/[0.09] rounded-lg px-5 py-2.5 cursor-pointer"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Zurück
                  </button>
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.1}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className={labelClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Dein Name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className={labelClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      E-Mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="deine@email.de"
                      value={form.email}
                      onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  {/* Projekt-Typ */}
                  <div>
                    <label
                      htmlFor="type"
                      className={labelClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Projekt-Typ
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {projektTypes.map((t) => (
                        <option key={t} value={t} className="bg-[#0f0f0f]">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nachricht */}
                  <div>
                    <label
                      htmlFor="message"
                      className={labelClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Nachricht
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      placeholder="Erzähl mir von deinem Projekt..."
                      value={form.message}
                      onChange={handleChange}
                      className={`${inputClass} resize-none`}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full bg-[#F5F5F0] text-[#080808] py-3 rounded-lg font-semibold text-sm hover:bg-white transition-colors cursor-pointer"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Nachricht senden
                  </button>
                </form>
              </FadeIn>
            )}
          </div>

          {/* ── RIGHT: Contact info sidebar ───────────────────── */}
          <div className="md:col-span-2">
            <FadeIn delay={0.2}>
              <div className="flex flex-col gap-8 pt-2">
                {/* Contact details */}
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-4"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Direkt
                  </p>

                  <ul className="flex flex-col gap-3">
                    {/* Email */}
                    <li className="flex flex-col gap-0.5">
                      <span
                        className="text-xs text-[#444] uppercase tracking-widest"
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

                    {/* Location */}
                    <li className="flex flex-col gap-0.5">
                      <span
                        className="text-xs text-[#444] uppercase tracking-widest"
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

                    {/* Response time */}
                    <li className="flex flex-col gap-0.5">
                      <span
                        className="text-xs text-[#444] uppercase tracking-widest"
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
                </div>

                {/* Availability badge */}
                <div className="flex items-center gap-2.5">
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

                {/* Subtle note */}
                <p
                  className="text-xs text-[#444] leading-relaxed border-t border-white/[0.05] pt-6"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Kein Sales-Druck. Wenn es nicht passt, sage ich es direkt.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </main>
  );
}
