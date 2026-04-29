import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kundenportal",
  description:
    "Ihr persönlicher Bereich – Projektübersicht, Dokumente und direkte Kommunikation mit Eric Schuck Webdesign.",
  alternates: { canonical: "/kundenportal" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
