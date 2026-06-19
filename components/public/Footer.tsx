import Link from "next/link";

const NAV_LINKS = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Projekte", href: "/projekte" },
  { label: "Über mich", href: "/ueber-mich" },
  { label: "Kontakt", href: "/kontakt" },
];

const LEGAL_LINKS = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
  { label: "AGB", href: "/agb" },
];

export function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-white/6 px-6 md:px-12 py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-4">
            <div className="inline-flex flex-col items-center self-start">
              <div className="inline-flex items-baseline">
                <span
                  style={{
                    fontFamily: "Georgia, serif",
                    fontWeight: 200,
                    color: "rgba(245,245,240,0.4)",
                    fontSize: "20px",
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
                  }}
                >
                  Schuck
                </span>
                <span
                  style={{
                    fontFamily: "Georgia, serif",
                    fontWeight: 200,
                    color: "rgba(245,245,240,0.4)",
                    fontSize: "20px",
                  }}
                >
                  ]
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "7px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(245,245,240,0.25)",
                  marginTop: "3px",
                }}
              >
                Webdesign
              </span>
            </div>
            <p
              className="text-sm text-[#555] max-w-50 leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Websites, die mehr als gut aussehen.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <p
              className="text-[10px] uppercase tracking-[0.14em] text-[#3a3a3a]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Navigation
            </p>
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-[#555] hover:text-[#F5F5F0] transition-colors"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <p
              className="text-[10px] uppercase tracking-[0.14em] text-[#3a3a3a]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Kontakt
            </p>
            <p className="text-sm text-[#555]" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <a href="mailto:info@schuck-webdesign.de" className="hover:text-[#F5F5F0] transition-colors">
                info@schuck-webdesign.de
              </a>
            </p>
            <p className="text-sm text-[#555]" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <a href="tel:+4917634445821" className="hover:text-[#F5F5F0] transition-colors">
                +49 176 3444 5821
              </a>
            </p>
            <p className="text-sm text-[#555]" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Deutschland
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-[#555]" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Verfügbar für neue Projekte
              </span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs text-[#3a3a3a]" style={{ fontFamily: "var(--font-dm-sans)" }}>
            © 2025 Schuck Webdesign
          </p>
          <div className="flex gap-5">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs text-[#3a3a3a] hover:text-[#666] transition-colors"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
