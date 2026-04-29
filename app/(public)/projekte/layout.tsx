import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projekte",
  description:
    "Ausgewählte Webdesign-Projekte von Eric Schuck. Entdecken Sie realisierte Websites für Unternehmen in der Region Miltenberg und Unterfranken.",
  alternates: { canonical: "/projekte" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
