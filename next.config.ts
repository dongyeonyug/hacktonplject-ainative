import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the service_role key strictly server-side; nothing PWA-specific needed here.
  // The service worker + manifest are served as static files from /public.
};

export default nextConfig;
