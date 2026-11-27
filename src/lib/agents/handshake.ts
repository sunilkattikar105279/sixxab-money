// Agent-to-agent handshake. Agents never call each other freely: every exchange is an envelope
// checked against the registry's call matrix and contract version, then logged (handshake_log table).
import { z } from 'zod';

export const AGENTS = ['orchestrator', 'markets', 'economy', 'liquidity', 'credit', 'world', 'coach', 'tutor', 'calm', 'guardrail', 'learner'] as const;
export type AgentId = (typeof AGENTS)[number];

export const CONTRACT_VERSION = '1.0';

/** Who may ask whom, for what. Anything not listed is refused. */
export const CALL_MATRIX: Record<AgentId, Partial<Record<AgentId, string[]>>> = {
  orchestrator: { markets: ['answer'], economy: ['answer'], liquidity: ['answer'], credit: ['answer'], world: ['answer'], coach: ['answer'], tutor: ['answer'], calm: ['assess'], guardrail: ['review'] },
  coach: { calm: ['assess'], markets: ['facts'], economy: ['facts'], liquidity: ['facts'], credit: ['facts'], tutor: ['lesson'] },
  markets: { economy: ['facts'], liquidity: ['facts'], credit: ['facts'] },
  economy: { markets: ['facts'], liquidity: ['facts'], credit: ['facts'] },
  liquidity: { markets: ['facts'], economy: ['facts'], credit: ['facts'] },
  credit: { markets: ['facts'], economy: ['facts'] },
  world: { economy: ['facts'] },
  tutor: {},
  calm: {},
  guardrail: {},
  // The learner may only propose changes; promotion goes through the learning gates, never a direct call.
  learner: { guardrail: ['review'] },
};

export const Envelope = z.object({
  traceId: z.string().min(8),
  from: z.enum(AGENTS),
  to: z.enum(AGENTS),
  intent: z.string().min(2),
  contract: z.string(),
  memberId: z.string().optional(),
  payload: z.record(z.unknown()),
  sentAt: z.string(),
});
export type Envelope = z.infer<typeof Envelope>;

export interface HandshakeResult { accepted: boolean; reason?: string }

export function handshake(raw: unknown): HandshakeResult {
  const p = Envelope.safeParse(raw);
  if (!p.success) return { accepted: false, reason: 'malformed envelope' };
  const e = p.data;
  if (e.contract.split('.')[0] !== CONTRACT_VERSION.split('.')[0]) return { accepted: false, reason: `contract ${e.contract} not supported (need ${CONTRACT_VERSION})` };
  if (e.from === e.to) return { accepted: false, reason: 'agent cannot call itself' };
  const allowed = CALL_MATRIX[e.from]?.[e.to];
  if (!allowed || !allowed.includes(e.intent)) return { accepted: false, reason: `${e.from} may not ask ${e.to} to ${e.intent}` };
  return { accepted: true };
}

export function envelope(from: AgentId, to: AgentId, intent: string, payload: Record<string, unknown>, memberId?: string): Envelope {
  return { traceId: crypto.randomUUID(), from, to, intent, contract: CONTRACT_VERSION, memberId, payload, sentAt: new Date().toISOString() };
}
