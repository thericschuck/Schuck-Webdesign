import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kostenloses Erstgespräch mit Eric Schuck – 15 Minuten, kein Druck. Erzählen Sie von Ihrem Projekt und erhalten Sie schnell eine ehrliche Einschätzung.",
  alternates: { canonical: "/kontakt" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
