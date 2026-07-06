import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, projects } from "../projects-data";
import { ImageLightbox } from "@/components/public/ImageLightbox";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjektDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main>
      <section style={{ backgroundColor: "#080808" }} className="px-6 pb-0 pt-36 md:px-12">
        <div className="mx-auto max-w-6xl">
          <span
            className="mb-6 inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest"
            style={{
              color: "#7F77DD",
              backgroundColor: "rgba(127, 119, 221, 0.1)",
              border: "1px solid rgba(127, 119, 221, 0.2)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {project.category}
          </span>

          <h1
            className="mb-8 text-5xl font-normal leading-tight md:text-6xl"
            style={{
              fontFamily: "var(--font-fraunces)",
              color: "#F5F5F0",
            }}
          >
            {project.name}
          </h1>

          <div
            className="mb-8 flex flex-wrap gap-6"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <span className="text-sm" style={{ color: "#A0A0AC" }}>
              <span style={{ color: "#686875" }}>Typ:</span> {project.category}
            </span>
            <span className="text-sm" style={{ color: "#A0A0AC" }}>
              <span style={{ color: "#686875" }}>Website:</span>{" "}
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors duration-200 hover:text-white"
              >
                {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </span>
          </div>

          <p
            className="max-w-2xl text-base md:text-lg leading-relaxed"
            style={{
              fontFamily: "var(--font-dm-sans)",
              color: "#B0B0BC",
            }}
          >
            {project.intro}
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: "#080808" }} className="px-6 pb-0 pt-8 md:px-12">
        <div className="mx-auto max-w-6xl">
          <ImageLightbox
            src={project.image}
            alt={project.name}
            blurDataURL={project.blurDataURL}
            badge="Case Study"
          />
        </div>
      </section>

      <section data-cursor="dark" style={{ backgroundColor: "#F7F5F0" }} className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h2
                className="mb-4 text-2xl font-normal"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  color: "#1C1C1E",
                }}
              >
                Die Aufgabe
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)", color: "#444" }}
              >
                {project.challenge}
              </p>
            </div>

            <div>
              <h2
                className="mb-4 text-2xl font-normal"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  color: "#1C1C1E",
                }}
              >
                Die Lösung
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)", color: "#444" }}
              >
                {project.solution}
              </p>
            </div>
          </div>

          <div>
            <h3
              className="mb-4 text-sm font-medium uppercase tracking-widest"
              style={{ fontFamily: "var(--font-dm-sans)", color: "#888" }}
            >
              Technologien
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "rgba(28, 28, 30, 0.1)",
                    color: "#1C1C1E",
                    borderColor: "rgba(28, 28, 30, 0.15)",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "#080808" }} className="px-6 py-14 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-opacity duration-200 hover:opacity-85"
            style={{
              backgroundColor: "#7F77DD",
              color: "#fff",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Live ansehen
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </a>
          <Link
            href="/projekte"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-[#F5F5F0]/75 transition-colors duration-200 hover:border-white/30 hover:text-[#F5F5F0]"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Alle Projekte
          </Link>
        </div>
      </section>
    </main>
  );
}
