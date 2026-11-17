'use client';
import { track as vercelTrack } from '@vercel/analytics';

/** Funnel events for the founding-member launch (cookieless Vercel Web Analytics). Never send personal data. */
export type FunnelEvent = 'join_click' | 'signup_submitted' | 'onboarding_done' | 'question_asked' | 'checkin_done' | 'invite_copied' | 'stage_quiz_done';

export function track(event: FunnelEvent, props?: Record<string, string | number | boolean>) {
  try { vercelTrack(event, props); } catch { /* analytics unavailable */ }
}
