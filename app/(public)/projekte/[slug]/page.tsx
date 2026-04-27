import Link from "next/link";

const slugs = [
  "projekt-alpha",
  "projekt-beta",
  "projekt-gamma",
  "projekt-delta",
  "projekt-epsilon",
  "projekt-zeta",
];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

function capitalizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function ProjektDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const displayName = capitalizeSlug(slug);

  return (
    <main>
      {/* Project Header */}
      <section style={{ backgroundColor: "#080808" }} className="pt-36 pb-0 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Category badge */}
          <span
            className="inline-block text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{
              color: "#7F77DD",
              backgroundColor: "rgba(127, 119, 221, 0.1)",
              border: "1px solid rgba(127, 119, 221, 0.2)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Platzhalter-Kategorie
          </span>

          {/* Headline */}
          <h1
            className="text-5xl md:text-6xl font-normal leading-tight mb-8"
            style={{
              fontFamily: "var(--font-fraunces)",
              color: "#F5F5F0",
            }}
          >
            {displayName} — Platzhalter-Projektname
          </h1>

          {/* Meta */}
          <div
            className="flex flex-wrap gap-6"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <span className="text-sm" style={{ color: "#555" }}>
              <span style={{ color: "#888" }}>Branche:</span> Platzhalter
            </span>
            <span className="text-sm" style={{ color: "#555" }}>
              <span style={{ color: "#888" }}>Jahr:</span> 2024
            </span>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <section style={{ backgroundColor: "#080808" }} className="px-6 md:px-12 pt-8 pb-0">
        <div className="max-w-6xl mx-auto">
          <div
            className="aspect-video w-full rounded-2xl border"
            style={{
              backgroundColor: "#1a1a1a",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      </section>

      {/* Details Section */}
      <section style={{ backgroundColor: "#F7F5F0" }} className="px-6 md:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Two-column: task + solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-14">
            {/* Left: Die Aufgabe */}
            <div>
              <h2
                className="text-2xl font-normal mb-4"
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
                Platzhaltertext für die Aufgabenstellung. Hier wird beschrieben,
                welche Herausforderungen der Kunde hatte und was das Ziel des
                Projekts war. Eine kurze, prägnante Zusammenfassung der
                Ausgangssituation und des Briefings.
              </p>
            </div>

            {/* Right: Die Lösung */}
            <div>
              <h2
                className="text-2xl font-normal mb-4"
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
                Platzhaltertext für die Lösung. Hier wird erklärt, welcher
                Ansatz gewählt wurde, welche Designentscheidungen getroffen
                wurden und wie die technische Umsetzung aussah. Ergebnis und
                Impact des Projekts.
              </p>
            </div>
          </div>

          {/* Technologies */}
          <div>
            <h3
              className="text-sm font-medium uppercase tracking-widest mb-4"
              style={{ fontFamily: "var(--font-dm-sans)", color: "#888" }}
            >
              Technologien
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase"].map(
                (tech) => (
                  <span
                    key={tech}
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      backgroundColor: "rgba(28, 28, 30, 0.1)",
                      color: "#1C1C1E",
                      borderColor: "rgba(28, 28, 30, 0.15)",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    {tech}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Next Project Bar */}
      <section style={{ backgroundColor: "#080808" }} className="px-6 md:px-12 py-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/projekte"
            className="text-sm transition-colors duration-200 hover:text-white"
            style={{ fontFamily: "var(--font-dm-sans)", color: "#555" }}
          >
            Nächstes Projekt →
          </Link>
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
