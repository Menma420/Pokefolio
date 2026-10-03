import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The CLI capture returns empty stdout in this environment; retain build type checking via the compiler API.
  experimental: { useTypeScriptCli: false },
  devIndicators: false,
};

export default nextConfig;
