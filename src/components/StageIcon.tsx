// Simple line illustrations for the six SIXXAB stages (no external images).
const PATHS: Record<number, React.ReactNode> = {
  1: <><circle cx="24" cy="30" r="10" /><path d="M24 20v-8M19 14l5-4 5 4" /></>,                       // seed and sprout
  2: <><path d="M8 38h32M12 38V24l12-10 12 10v14" /><path d="M20 38v-8h8v8" /></>,                       // first home base
  3: <><path d="M8 36l10-10 8 6 14-16" /><path d="M32 16h8v8" /></>,                                      // growth line
  4: <><path d="M24 8l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" /></>,                                  // star
  5: <><path d="M24 40s-14-8-14-19a8 8 0 0114-5 8 8 0 0114 5c0 11-14 19-14 19z" /></>,                    // heart: giving
  6: <><path d="M10 40h28M14 40V22M24 40V14M34 40V22M10 22h28L24 10z" /></>,                              // pillars: legacy
};

export function StageIcon({ n, size = 36 }: { n: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="#D4A84B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[n]}
    </svg>
  );
}
