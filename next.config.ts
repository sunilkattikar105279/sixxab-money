import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';

// Content Security Policy: only the origins the portal actually uses.
// 'unsafe-inline' scripts are needed for Next.js bootstrapping and the extension-attribute cleaner in layout.tsx.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://www.instagram.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://media.viewmax.io",
  "frame-src https://www.instagram.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.instagram.com https://vitals.vercel-insights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const security = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: security },
      // Personal data must never sit in shared caches.
      { source: '/api/(profile|plan|checkin|feedback|agent|learning)(.*)', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/my-money(.*)', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
  },
};

export default nextConfig;
