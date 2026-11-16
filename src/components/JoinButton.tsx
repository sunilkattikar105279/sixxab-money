'use client';
import Link from 'next/link';
import { track } from '@/lib/track';

export function JoinButton({ label, from = 'home_hero' }: { label: string; from?: string }) {
  return <Link href="/login?join=1" className="btn btn-gold" onClick={() => track('join_click', { from })}>{label}</Link>;
}
