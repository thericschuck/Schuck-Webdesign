import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leistungen",
  description:
    "Webdesign, SEO und digitale Beratung für Unternehmen in Miltenberg und Unterfranken. Individuelle, performante Websites – vom ersten Entwurf bis zum Launch.",
  alternates: { canonical: "/leistungen" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
