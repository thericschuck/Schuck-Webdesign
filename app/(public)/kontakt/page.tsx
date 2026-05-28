"use client";

import { useState, useTransition } from "react";
import { FadeIn } from "@/components/public/FadeIn";
import { ParticleCanvas } from "@/components/public/ParticleCanvas";
import { submitContact } from "./actions";

interface FormState {
  name: string;
  email: string;
  phone: string;
  type: string;
  message: string;
}

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
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
  "w-full bg-[#F4F2ED] border border-black/10 rounded-lg px-4 py-3 text-sm text-[#1C1C1E] focus:outline-none focus:border-[#7F77DD]/60 transition-colors placeholder:text-[#aaa]";

const labelClass = "block text-xs uppercase tracking-widest text-[#999] mb-1.5";

export default function KontaktPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    startTransition(async () => {
      const result = await submitContact(null, formData);
      if (result.status === 'success') {
        setIsSubmitted(true);
      } else {
        setError(result.message);
      }
    });
  }



  return (
    <main className="flex flex-col md:flex-row-reverse" style={{ minHeight: "100dvh" }}>

      {/* ── Light right — Form ────────────────────────────────────────── */}
      <div
        data-cursor="dark"
        className="bg-[#F7F5F0] md:w-[55%] flex flex-col justify-center px-8 md:px-14 py-16 md:py-24"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <FadeIn>
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
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <a
                    href="/"
                    className="text-xs uppercase tracking-widest text-[#F5F5F0] bg-[#1C1C1E] hover:bg-[#2a2a2a] transition-colors rounded-lg px-5 py-2.5 text-center cursor-pointer"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Zur Startseite
                  </a>
                  <a
                    href="/projekte"
                    className="text-xs uppercase tracking-widest text-[#888] hover:text-[#1C1C1E] transition-colors border border-black/10 rounded-lg px-5 py-2.5 text-center cursor-pointer"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Projekte ansehen
                  </a>
                </div>
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

                  <div>
                    <label
                      htmlFor="phone"
                      className={labelClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Telefon <span className="normal-case tracking-normal text-[#bbb]">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+49 176 ..."
                      value={form.phone}
                      onChange={handleChange}
                      className={inputClass}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    />
                  </div>

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
                        <option key={t} value={t} className="bg-white">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

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

                  {error && (
                    <p
                      className="text-xs text-red-500 text-center -mt-1"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    data-cursor="light"
                    className="w-full bg-[#1C1C1E] text-[#F5F5F0] py-3 rounded-lg font-semibold text-sm hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors cursor-pointer mt-1"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {isPending ? "Wird gesendet…" : "Nachricht senden"}
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

      {/* ── Dark left — Info ─────────────────────────────────────────── */}
      <div className="relative bg-[#080808] md:w-[45%] flex flex-col items-center justify-center px-8 md:px-12 pt-28 pb-16 md:py-24 overflow-hidden">
        <ParticleCanvas />

        {/* Atmospheric glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 60% 50%, rgba(127,119,221,0.07) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        {/* Glass card — centered */}
        <FadeIn delay={0.15} className="relative z-10 w-full max-w-sm">
          <div
            className="rounded-2xl p-8 flex flex-col gap-7"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(2px) saturate(150%)",
              WebkitBackdropFilter: "blur(2px) saturate(150%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Heading */}
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.14em] text-[#7F77DD] mb-4"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Kontakt
              </p>
              <h1
                className="text-4xl md:text-[44px] font-semibold text-[#F5F5F0] leading-[1.1] tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Lass uns<br />sprechen.
              </h1>
              <p
                className="mt-4 text-sm text-white/55 leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Beschreib mir kurz dein Vorhaben — was du brauchst, bis wann
                und was du ungefähr investieren möchtest. Je mehr Details,
                desto besser kann ich einschätzen, ob und wie ich helfen kann.
                Du erreichst mich auch direkt per Telefon, falls du lieber
                persönlich sprechen möchtest.
              </p>
            </div>

            {/* Contact details */}
            <ul className="flex flex-col gap-4 border-t border-white/[0.07] pt-6">
              {[
                { label: "E-Mail", value: "info@schuck-webdesign.de", href: "mailto:info@schuck-webdesign.de" },
                { label: "Telefon", value: "+49 176 3444 5821", href: "tel:+4917634445821" },
                { label: "Standort", value: "Deutschland" },
                { label: "Antwortzeit", value: "Innerhalb von 48h" },
              ].map(({ label, value, href }) => (
                <li key={label} className="flex flex-col gap-0.5">
                  <span
                    className="text-[10px] uppercase tracking-[0.12em] text-white/35"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {label}
                  </span>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm text-white/80 hover:text-[#7F77DD] transition-colors"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {value}
                    </a>
                  ) : (
                    <span
                      className="text-sm text-white/60"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {value}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* Availability */}
            <div className="flex items-center gap-2.5 border-t border-white/[0.07] pt-6">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
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

    </main>
  );
}
