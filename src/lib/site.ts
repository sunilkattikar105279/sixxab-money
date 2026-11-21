/** Public identity of the portal, used by the legal pages, metadata and footer. Override with env vars on Vercel. */
export const SITE = {
  name: 'SIXXAB Money',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://money.sixxab.com',
  operator: process.env.NEXT_PUBLIC_OPERATOR ?? 'SIXXAB LLC',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'support@sunilkattikar.com',
  /** Physical mailing address required in marketing email (CAN-SPAM). Set NEXT_PUBLIC_POSTAL_ADDRESS on Vercel and in GitHub secrets. */
  postalAddress: process.env.NEXT_PUBLIC_POSTAL_ADDRESS ?? '',
  jurisdiction: process.env.NEXT_PUBLIC_JURISDICTION ?? 'the State of Texas, USA',
  legalUpdated: 'November 15, 2026',
};
