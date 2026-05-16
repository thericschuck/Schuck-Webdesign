import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explizit den Projektordner als Workspace-Root setzen,
    // damit Tailwind CSS v4 aus dem richtigen node_modules aufgelöst wird.
    root: path.resolve(__dirname),
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
