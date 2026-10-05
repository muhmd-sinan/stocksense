import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Phosphor isn't in Next's default list; load only the icons we import
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
