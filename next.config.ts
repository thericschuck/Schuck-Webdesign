import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explizit den Projektordner als Workspace-Root setzen,
    // damit Tailwind CSS v4 aus dem richtigen node_modules aufgelöst wird.
    root: path.resolve(__dirname),
  },
  images: {
    // 75 ist der Next.js-Default; 95 wird für die Projekt-Vorschaubilder auf der
    // Startseite explizit angefordert (app/(public)/page.tsx) und muss deshalb hier freigegeben sein.
    qualities: [75, 95],
  },
  experimental: {
    serverActions: {
      // Next.js' Default (1 MB) wäre für Datei-Uploads (Server Actions in
      // app/(portal)/portal/upload/actions.ts und app/(admin)/admin/projects/[id]/actions.ts)
      // längst vor dem eigenen App-Limit (lib/uploadLimits.ts) dichtgemacht — etwas Puffer
      // über dem App-Limit für Multipart-Overhead. Wird dieses Limit überschritten, bricht
      // Next.js das Parsing der Server Action mitten im Stream ab (kein handhabbarer Fehler,
      // sondern ein Absturz "Unexpected end of form") — deshalb zusätzlich die Client-seitige
      // Vorabprüfung in den Upload-Formularen, die eine zu große Datei gar nicht erst abschickt.
      bodySizeLimit: '90mb',
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
