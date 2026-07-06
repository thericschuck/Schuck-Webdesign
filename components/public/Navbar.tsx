"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Projekte", href: "/projekte" },
  { label: "Kundenportal", href: "/kundenportal" },
  { label: "Über mich", href: "/ueber-mich" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center group">
      <Image
        src="/logo_transparent.png"
        alt="Schuck Webdesign"
        width={880}
        height={400}
        priority
        className="h-11 w-auto"
      />
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const alwaysVisible = ["/kontakt", "/impressum", "/datenschutz"].includes(pathname);
  const isActive = scrolled || alwaysVisible || menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isActive ? "border-b border-white/[0.07]" : "bg-transparent"
        }`}
        style={
          isActive
            ? {
                background: "rgba(8,8,8,0.72)",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)",
              }
            : undefined
        }
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Logo />

          {/* Desktop nav links */}
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

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs text-white/35 hover:text-white/70 transition-colors duration-200"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="opacity-60"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              Kundenbereich
            </Link>
            <span className="w-px h-4 bg-white/10" />
            <Link
              href="/kontakt"
              className="nav-cta inline-flex items-center px-5 py-2 rounded-md border border-white/10 text-sm text-white/55 hover:text-white hover:border-white/25 transition-all"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Projekt starten
            </Link>
          </div>

          {/* Hamburger / Close — mobile only */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex flex-col justify-center gap-[6px] w-10 h-10 -mr-2 focus:outline-none"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menuOpen}
          >
            <span
              className="block h-px bg-white/70 transition-all duration-300 origin-center"
              style={{
                width: "20px",
                transform: menuOpen
                  ? "translateY(7px) rotate(45deg)"
                  : "none",
              }}
            />
            <span
              className="block w-5 h-px bg-white/70 transition-all duration-300"
              style={{ opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="block h-px bg-white/70 transition-all duration-300 origin-center"
              style={{
                width: menuOpen ? "20px" : "12px",
                transform: menuOpen
                  ? "translateY(-7px) rotate(-45deg)"
                  : "none",
              }}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden bg-black/50"
              onClick={() => setMenuOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-16 left-0 right-0 z-40 md:hidden"
              style={{
                background: "rgba(8,8,8,0.96)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Nav links */}
              <div className="px-6 pt-4 pb-2">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center py-4 border-b border-white/[0.06] last:border-0 text-base transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      color:
                        pathname === href
                          ? "#F5F5F0"
                          : "rgba(245,245,240,0.45)",
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* CTAs */}
              <div className="px-6 pt-4 pb-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-sm transition-colors"
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    color: "rgba(245,245,240,0.45)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  Kundenbereich
                </Link>
                <Link
                  href="/kontakt"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center py-3.5 rounded-xl bg-[#F5F5F0] text-[#080808] text-sm font-semibold hover:bg-white transition-colors"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Projekt starten
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
