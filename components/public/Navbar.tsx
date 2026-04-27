"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Projekte", href: "/projekte" },
  { label: "Kundenportal", href: "/kundenportal" },
  { label: "Über mich", href: "/ueber-mich" },
];

function Logo() {
  return (
    <Link href="/" className="flex flex-col items-center leading-none group">
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
        }}
      >
        Webdesign
      </span>
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const alwaysVisible = ["/kontakt", "/impressum", "/datenschutz"].includes(pathname);
  const isActive = scrolled || alwaysVisible;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isActive
          ? "border-b border-white/[0.07]"
          : "bg-transparent"
      }`}
      style={isActive ? {
        background: "rgba(8,8,8,0.55)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)",
      } : undefined}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Logo />

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="nav-link text-sm text-white/40 hover:text-white transition-colors duration-200 pb-2"
              data-active={pathname === href ? "true" : undefined}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {label}
              <span className="nav-dot" aria-hidden />
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Portal login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs text-white/35 hover:text-white/70 transition-colors duration-200"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="opacity-60">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Kundenbereich
          </Link>

          {/* Divider */}
          <span className="w-px h-4 bg-white/10" />

          {/* CTA */}
          <Link
            href="/kontakt"
            className="nav-cta inline-flex items-center px-5 py-2 rounded-md border border-white/10 text-sm text-white/55 hover:text-white hover:border-white/25 transition-all"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Projekt starten
          </Link>
        </div>

        <button className="md:hidden flex flex-col gap-1.5 p-1" aria-label="Menü öffnen">
          <span className="w-5 h-px bg-white/50" />
          <span className="w-5 h-px bg-white/50" />
          <span className="w-3 h-px bg-white/50" />
        </button>
      </div>
    </nav>
  );
}
