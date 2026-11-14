import { describe, expect, it } from 'vitest';
import { handshake, envelope } from '@/lib/agents/handshake';
import { canMove, passesEval, passesCanary, needsSecondApprover } from '@/lib/learning/gates';

describe('agent handshake', () => {
  it('accepts allowed calls', () => {
    expect(handshake(envelope('orchestrator', 'markets', 'answer', {})).accepted).toBe(true);
    expect(handshake(envelope('coach', 'calm', 'assess', {})).accepted).toBe(true);
  });
  it('refuses calls outside the matrix', () => {
    const r = handshake(envelope('tutor', 'markets', 'answer', {}));
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('may not');
  });
  it('stops the learner from changing agents directly', () => {
    expect(handshake(envelope('learner', 'coach', 'answer', {})).accepted).toBe(false);
  });
  it('refuses a newer major contract', () => {
    expect(handshake({ ...envelope('orchestrator', 'markets', 'answer', {}), contract: '2.0' }).accepted).toBe(false);
  });
  it('refuses malformed envelopes', () => {
    expect(handshake({ from: 'x' }).accepted).toBe(false);
  });
});

describe('learning gates', () => {
  it('enforces the gate order', () => {
    expect(canMove('proposed', 'evaluated')).toBe(true);
    expect(canMove('proposed', 'live')).toBe(false);
    expect(canMove('shadow', 'approved')).toBe(false);
    expect(canMove('live', 'rolled_back')).toBe(true);
  });
  it('rejects candidates without uplift or with guardrail regressions', () => {
    expect(passesEval({ baselineScore: 0.8, candidateScore: 0.81, guardrailRegressions: 0, sourceCoverage: 1 }).pass).toBe(false);
    expect(passesEval({ baselineScore: 0.8, candidateScore: 0.9, guardrailRegressions: 1, sourceCoverage: 1 }).pass).toBe(false);
    expect(passesEval({ baselineScore: 0.8, candidateScore: 0.85, guardrailRegressions: 0, sourceCoverage: 0.99 }).pass).toBe(true);
  });
  it('needs enough canary members and no extra complaints', () => {
    expect(passesCanary({ members: 50, complaintRate: 0.01, baselineComplaintRate: 0.02, guardrailFlags: 0 }).pass).toBe(false);
    expect(passesCanary({ members: 500, complaintRate: 0.03, baselineComplaintRate: 0.02, guardrailFlags: 0 }).pass).toBe(false);
    expect(passesCanary({ members: 500, complaintRate: 0.01, baselineComplaintRate: 0.02, guardrailFlags: 0 }).pass).toBe(true);
  });
  it('requires two approvers for sensitive areas', () => {
    expect(needsSecondApprover(['emotion'])).toBe(true);
    expect(needsSecondApprover(['formatting'])).toBe(false);
  });
});
