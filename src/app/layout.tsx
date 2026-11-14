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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
