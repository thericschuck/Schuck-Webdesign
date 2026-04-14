import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explizit den Projektordner als Workspace-Root setzen,
    // damit Tailwind CSS v4 aus dem richtigen node_modules aufgelöst wird.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
