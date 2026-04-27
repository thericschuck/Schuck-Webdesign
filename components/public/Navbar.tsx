"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Projekte", href: "/projekte" },
  { label: "Über mich", href: "/ueber-mich" },
];

function Logo() {
  return (
    <Link href="/" className="flex flex-col items-start leading-none group">
      <div className="flex items-baseline">
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 200,
            color: "rgba(245,245,240,0.45)",
            fontSize: "21px",
            lineHeight: 1,
          }}
        >
          [
        </span>
        <span
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 700,
            color: "#F5F5F0",
            fontSize: "18px",
            margin: "0 4px",
            lineHeight: 1,
          }}
        >
          Schuck
        </span>
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 200,
            color: "rgba(245,245,240,0.45)",
            fontSize: "21px",
            lineHeight: 1,
          }}
        >
          ]
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "7px",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(245,245,240,0.28)",
          marginTop: "3px",
          display: "block",
          paddingLeft: "1px",
        }}
      >
        Webdesign
      </span>
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080808]/90 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Logo />

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm text-white/40 hover:text-white/75 transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {label}
            </Link>
          ))}
        </div>

        <Link
          href="/kontakt"
          className="hidden md:inline-flex items-center px-5 py-2 rounded-md border border-white/10 text-sm text-white/55 hover:text-white hover:border-white/25 transition-all"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Projekt starten
        </Link>

        <button className="md:hidden flex flex-col gap-1.5 p-1" aria-label="Menü öffnen">
          <span className="w-5 h-px bg-white/50" />
          <span className="w-5 h-px bg-white/50" />
          <span className="w-3 h-px bg-white/50" />
        </button>
      </div>
    </nav>
  );
}
