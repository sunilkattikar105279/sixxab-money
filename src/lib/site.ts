/** Public identity of the portal, used by the legal pages, metadata and footer. Override with env vars on Vercel. */
export const SITE = {
  name: 'SIXXAB Money',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://money.sixxab.com',
  operator: process.env.NEXT_PUBLIC_OPERATOR ?? 'SIXXAB AI',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'support@sunilkattikar.com',
  jurisdiction: process.env.NEXT_PUBLIC_JURISDICTION ?? 'the State of Texas, USA',
  legalUpdated: 'November 15, 2026',
};
