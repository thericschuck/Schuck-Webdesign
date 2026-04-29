import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Webdesign Miltenberg | Eric Schuck – Websites für lokale Unternehmen",
    template: "%s | Eric Schuck Webdesign",
  },
  description:
    "Webdesigner aus Miltenberg – professionelle Websites für Kleinunternehmen & Selbstständige in Unterfranken. Jetzt kostenloses Erstgespräch buchen!",
  metadataBase: new URL("https://schuck-webdesign.de"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  authors: [{ name: "Eric Schuck" }],
  openGraph: {
    title: "Eric Schuck – Webdesign & SEO",
    description:
      "Moderne Websites für Unternehmen und Selbstständige. Jetzt kostenlos beraten lassen.",
    type: "website",
    url: "https://schuck-webdesign.de/",
    locale: "de_DE",
    siteName: "Eric Schuck Webdesign",
    images: [
      {
        url: "https://schuck-webdesign.de/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vorschau der Webdesign-Leistungen von Eric Schuck",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eric Schuck – Webdesign & SEO",
    description:
      "Webdesign für moderne Unternehmen – individuell, klar, wirkungsvoll. Professionelle Websites von Eric Schuck.",
    images: [
      {
        url: "https://schuck-webdesign.de/og-image.png",
        alt: "Vorschau der Webdesign-Leistungen von Eric Schuck",
      },
    ],
  },
  other: {
    "theme-color": "#0b1020",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Eric Schuck Webdesign & SEO",
  url: "https://schuck-webdesign.de/",
  description:
    "Webdesign und SEO für lokale Unternehmen in Miltenberg und Unterfranken.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Miltenberg",
    addressRegion: "Bayern",
    addressCountry: "DE",
  },
  areaServed: ["Miltenberg", "Aschaffenburg", "Unterfranken"],
  telephone: "+4917634445821",
  sameAs: [
    "https://github.com/Eric-Alexander-07",
    "https://wa.me/4917634445821",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${playfair.variable} ${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ED9BGD4HMM"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ED9BGD4HMM');
          `}
        </Script>
      </body>
    </html>
  );
}
