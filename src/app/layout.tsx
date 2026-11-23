import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SITE } from '@/lib/site';
import './globals.css';

const description = 'A free personal money coach for the US and India: plain-English market briefs, a 90-day plan for your goal and a 6-stage money journey from age 11. Education, not investment advice.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'SIXXAB Money: your money coach for the US and India', template: '%s · SIXXAB Money' },
  description,
  applicationName: SITE.name,
  icons: { icon: '/sx-icon.svg', apple: '/sixxab-money-logo.png' },
  openGraph: { type: 'website', siteName: SITE.name, title: 'SIXXAB Money: your money coach for the US and India', description, url: '/', images: [{ url: '/sixxab-money-logo.png', alt: 'SIXXAB Money' }] },
  twitter: { card: 'summary', title: 'SIXXAB Money', description, images: ['/sixxab-money-logo.png'] },
};

export const viewport: Viewport = { themeColor: '#071426', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Some security extensions (e.g. Bitdefender) add attributes such as bis_skin_checked before React loads,
            which makes React report a hydration mismatch. Strip them as they appear. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){var bad=function(n){return n.indexOf('bis_')===0||n.indexOf('__processed_')===0};var clean=function(el){if(!el||!el.attributes)return;for(var i=el.attributes.length-1;i>=0;i--){var n=el.attributes[i].name;if(bad(n))el.removeAttribute(n)}};new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='attributes'&&m.attributeName&&bad(m.attributeName))m.target.removeAttribute(m.attributeName);if(m.addedNodes)m.addedNodes.forEach(function(x){clean(x);if(x.querySelectorAll)x.querySelectorAll('*').forEach(clean)})})}).observe(document.documentElement,{attributes:true,childList:true,subtree:true});})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Manrope:wght@400;500;600;700;800&family=Montserrat:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main" className="skip">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
