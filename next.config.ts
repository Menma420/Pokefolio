import type { NextConfig } from "next";

// The opt-in loopback reconstruction uses webpack's development source maps.
// This exception is absent from every production build and the normal game.
const localSourceDev=process.env.NODE_ENV==='development'&&process.env.EMERALD_LOCAL==='1';
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${localSourceDev?"'unsafe-eval'":''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const nextConfig: NextConfig = {
  // Keep source-scene hot reload/type output independent of normal production
  // builds and their regression server running from the same checkout.
  distDir:localSourceDev?'.next-emerald-local':'.next',
  experimental: { useTypeScriptCli: false },
  devIndicators: false,
  // Local extracted assets must never enter a standalone/serverless deployment,
  // including through Next's static fs dependency tracing.
  outputFileTracingExcludes: {'/dev/emerald/**':['./artifacts/emerald-source/**','./pokeemerald/**']},
  webpack(config,{dev}) {
    if(localSourceDev&&dev){
      // Next's default ignore matches `.next`, not our isolated cache. The
      // runtime fs route creates a context dependency: watching that cache
      // would rebuild/reload itself whenever Next writes its own manifests.
      const ignored=config.watchOptions?.ignored;
      const local=/[\\/](?:\.next(?:-emerald-local)?|pokeemerald|artifacts)(?:[\\/]|$)/;
      config.watchOptions={...config.watchOptions,ignored:ignored instanceof RegExp
        ?new RegExp(`(?:${ignored.source})|(?:${local.source})`,ignored.flags)
        :[...(Array.isArray(ignored)?ignored:typeof ignored==='string'?[ignored]:[]),'**/.next/**','**/.next-emerald-local/**','**/artifacts/**','**/pokeemerald/**']};
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
