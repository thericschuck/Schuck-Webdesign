import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über mich",
  description:
    "Eric Schuck – Webdesigner aus Miltenberg. Leidenschaft für sauberen Code und modernes Design. Lernen Sie mich kennen.",
  alternates: { canonical: "/ueber-mich" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
