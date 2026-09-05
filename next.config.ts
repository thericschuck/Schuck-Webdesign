import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Erlaubt den Cloudflare-Quick-Tunnel als Dev-Origin — sonst blockt Next.js
  // HMR-Requests (/_next/webpack-hmr) von fremden Hosts und die Seite bleibt
  // clientseitig tot (kein Hydration, keine Navigation). Nur für lokale
  // Tunnel-Sessions relevant, ändert nichts an Produktion/Vercel.
  allowedDevOrigins: ['dust-patch-tampa-stevens.trycloudflare.com'],
  turbopack: {
    // Explizit den Projektordner als Workspace-Root setzen,
    // damit Tailwind CSS v4 aus dem richtigen node_modules aufgelöst wird.
    root: path.resolve(__dirname),
  },
  // Chromium und puppeteer-core dürfen NICHT gebündelt werden — der Bundler
  // würde sonst versuchen, die Browser-Binary mitzuziehen. Sie werden zur
  // Laufzeit aus node_modules geladen (lib/documents/pdf.ts).
  // Auf Vercel braucht das Projekt zusätzlich VERCEL_SUPPORT_LARGE_FUNCTIONS=1:
  // das volle @sparticuz/chromium liegt über dem 250-MB-Standardlimit und
  // benötigt "Large Functions" (bis 5 GB, setzt Fluid Compute voraus).
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  images: {
    // 75 ist der Next.js-Default; 95 wird für die Projekt-Vorschaubilder auf der
    // Startseite explizit angefordert (app/(public)/page.tsx) und muss deshalb hier freigegeben sein.
    qualities: [75, 95],
  },
  experimental: {
    serverActions: {
      // Dateien laufen NICHT mehr durch Server Actions, sondern gehen per signierter URL
      // direkt vom Browser in den Supabase-Storage (lib/use-direct-upload.ts). Deshalb hier
      // bewusst ein kleines Limit UNTERHALB von Vercels harter 4,5-MB-Grenze für
      // Request-Bodies: so verhält sich lokal alles wie in Produktion, statt dass ein
      // großer Body erst auf Vercel scheitert.
      bodySizeLimit: '4mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/impressum.html',
        destination: '/impressum',
        permanent: true,
      },
      {
        source: '/datenschutz.html',
        destination: '/datenschutz',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
