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
