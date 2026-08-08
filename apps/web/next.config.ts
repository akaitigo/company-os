import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  agentRules: false,
  headers: () =>
    Promise.resolve([
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' http://localhost:8080",
          },
        ],
      },
    ]),
};
export default config;
