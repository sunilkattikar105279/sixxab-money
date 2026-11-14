import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIXXAB Money: markets, economy and your money, explained',
  description: 'Transparent money leadership for US, India and global users: markets, economy, world events and a personal 6S money journey from age 11.',
};

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
