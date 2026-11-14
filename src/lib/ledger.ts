import { adminClient } from './supabase/admin';
import type { AskResult } from './agents/orchestrator';

/** Transparency ledger: every agent answer is stored with its inputs, sources, model and confidence. */
export async function record(question: string, memberId: string | undefined, r: AskResult): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data, error } = await db.from('agent_ledger').insert({
    member_id: memberId ?? null,
    question,
    domain: r.domain,
    answer: r.answer,
    sources: r.sources,
    guard_flags: r.flags,
    model: r.model,
    confidence: r.confidence ?? null,
    emotion_tone: r.emotion.tone,
    emotion_signals: r.emotion.signals,
  }).select('id').single();
  if (error) return null;
  if (r.handshakes.length) {
    await db.from('handshake_log').insert(r.handshakes.map((h) => ({ ledger_id: data.id, trace_id: h.envelope.traceId, from_agent: h.envelope.from, to_agent: h.envelope.to, intent: h.envelope.intent, contract: h.envelope.contract, accepted: h.accepted, reason: h.reason ?? null })));
  }
  return data.id as string;
}
