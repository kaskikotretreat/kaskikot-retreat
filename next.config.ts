import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Allow local network IP/devices to access the dev server without host blocking
  serverExternalPackages: [],
  experimental: {
    // If Next.js blocks incoming IPs on your local network, you can allow them here:
    serverActions: {
      allowedOrigins: ["*"], // or specify your local subnet like ["192.168.1.*:3000"]
    },
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();