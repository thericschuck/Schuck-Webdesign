"use client";

import Link from "next/link";
import { FadeIn } from "@/components/public/FadeIn";

const projects = [
  {
    slug: "projekt-alpha",
    name: "Projekt Alpha",
    category: "E-Commerce",
    desc: "Online-Shop Relaunch mit neuem Branding.",
  },
  {
    slug: "projekt-beta",
    name: "Projekt Beta",
    category: "Corporate",
    desc: "Lead-optimierte Unternehmenswebsite.",
  },
  {
    slug: "projekt-gamma",
    name: "Projekt Gamma",
    category: "Restaurant",
    desc: "Digitale Präsenz für ein Premium-Restaurant.",
  },
  {
    slug: "projekt-delta",
    name: "Projekt Delta",
    category: "Startup",
    desc: "MVP-Landing-Page mit Conversion-Fokus.",
  },
  {
    slug: "projekt-epsilon",
    name: "Projekt Epsilon",
    category: "Handwerk",
    desc: "Lokale Website mit Google-Optimierung.",
  },
  {
    slug: "projekt-zeta",
    name: "Projekt Zeta",
    category: "Coaching",
    desc: "Personal-Brand-Website mit Buchungs-Flow.",
  },
];

export default function ProjektePage() {
  return (
    <main>
      {/* Page Header */}
      <section
        style={{ backgroundColor: "#080808" }}
        className="pt-36 pb-16 px-6 md:px-12"
      >
        <div className="max-w-6xl mx-auto">
          <FadeIn delay={0}>
            <span
              className="inline-block text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full mb-6"
              style={{
                color: "#7F77DD",
                backgroundColor: "rgba(127, 119, 221, 0.1)",
                border: "1px solid rgba(127, 119, 221, 0.2)",
              }}
            >
              Alle Projekte
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
              Arbeiten, die überzeugen.
            </h1>
          </FadeIn>
          <FadeIn delay={0.14}>
            <p
              className="text-base md:text-lg max-w-xl"
              style={{
                fontFamily: "var(--font-dm-sans)",
                color: "#666",
              }}
            >
              Eine Auswahl abgeschlossener Projekte — von der Konzeption bis
              zum Launch.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Project Grid */}
      <section
        style={{ backgroundColor: "#0b0b0b" }}
        className="px-6 md:px-12 py-16"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, i) => (
            <FadeIn key={project.slug} delay={i * 0.05}>
              <Link
                href={`/projekte/${project.slug}`}
                className="group flex flex-col gap-3 hover:-translate-y-1.5 transition-transform duration-300 ease-out"
              >
                {/* Image placeholder */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.07] bg-[#161616]">
                  {/* Zoom layer */}
                  <div className="absolute inset-0 bg-[#161616] group-hover:scale-[1.03] transition-transform duration-300 ease-out" />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 ease-out z-10" />
                  {/* Category badge */}
                  <div className="absolute bottom-3 left-3 z-20">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        color: "#7F77DD",
                        backgroundColor: "rgba(127, 119, 221, 0.15)",
                        border: "1px solid rgba(127, 119, 221, 0.25)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {project.category}
                    </span>
                  </div>
                  {/* Arrow icon */}
                  <div className="absolute right-3 bottom-3 z-20 opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>

                {/* Card text */}
                <div className="flex flex-col gap-1 px-0.5">
                  <p
                    className="font-semibold text-sm group-hover:text-white transition-colors duration-200"
                    style={{
                      color: "#F5F5F0",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {project.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{
                      color: "#555",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {project.desc}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>
    </main>
  );
}
