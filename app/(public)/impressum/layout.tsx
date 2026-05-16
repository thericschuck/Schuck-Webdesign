import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum von Eric Schuck Webdesign – Angaben gemäß § 5 TMG.",
  alternates: { canonical: "/impressum" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
