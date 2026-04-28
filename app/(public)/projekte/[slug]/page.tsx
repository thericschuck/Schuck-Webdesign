import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProjectBySlug, projects } from "../projects-data";

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
            <span className="text-sm" style={{ color: "#555" }}>
              <span style={{ color: "#888" }}>Typ:</span> {project.category}
            </span>
            <span className="text-sm" style={{ color: "#555" }}>
              <span style={{ color: "#888" }}>Website:</span>{" "}
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
            className="max-w-2xl text-base md:text-lg"
            style={{
              fontFamily: "var(--font-dm-sans)",
              color: "#8A8A8F",
            }}
          >
            {project.intro}
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: "#080808" }} className="px-6 pb-0 pt-8 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div
            className="relative aspect-video w-full overflow-hidden rounded-2xl border"
            style={{
              backgroundColor: "#101010",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Image
              src={project.image}
              alt={project.name}
              fill
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={project.blurDataURL}
              priority
            />
            {/* gradient only behind bottom text */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute left-6 top-6">
              <p
                className="text-xs uppercase tracking-[0.3em]"
                style={{
                  color: "rgba(245,245,240,0.7)",
                  fontFamily: "var(--font-dm-sans)",
                  textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                }}
              >
                Case Study
              </p>
            </div>
            <div className="absolute inset-x-6 bottom-6 md:inset-x-10 md:bottom-10">
              <p
                className="text-3xl leading-none md:text-5xl"
                style={{
                  color: "#F5F5F0",
                  fontFamily: "var(--font-fraunces)",
                }}
              >
                {project.name}
              </p>
              <p
                className="mt-3 max-w-xl text-sm md:text-base"
                style={{
                  color: "rgba(245,245,240,0.62)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {project.shortDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "#F7F5F0" }} className="px-6 py-20 md:px-12">
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

      <section style={{ backgroundColor: "#080808" }} className="px-6 py-12 md:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm transition-colors duration-200 hover:text-white"
            style={{ fontFamily: "var(--font-dm-sans)", color: "#555" }}
          >
            Live ansehen -&gt;
          </a>
          <Link
            href="/projekte"
            className="text-sm transition-colors duration-200 hover:text-white"
            style={{ fontFamily: "var(--font-dm-sans)", color: "#555" }}
          >
            Alle Projekte
          </Link>
        </div>
      </section>
    </main>
  );
}
