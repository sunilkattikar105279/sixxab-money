// Governed self-learning. Agents learn from feedback (thumbs, corrections, outcome data), but a learned
// change (new prompt, rule or weight) is only a PROPOSAL until it passes every gate in order.
// The database enforces the same order (learning_proposals trigger), so no code path can skip a gate.

export const STAGES = ['proposed', 'evaluated', 'shadow', 'canary', 'approved', 'live', 'rolled_back', 'rejected'] as const;
export type ProposalStage = (typeof STAGES)[number];

export interface EvalReport {
  baselineScore: number; // 0..1 on the frozen eval set
  candidateScore: number;
  guardrailRegressions: number; // answers that newly trip the guardrail
  sourceCoverage: number; // share of numeric claims with a source, 0..1
}

export interface CanaryReport { members: number; complaintRate: number; baselineComplaintRate: number; guardrailFlags: number }

export const THRESHOLDS = { minUplift: 0.02, minSourceCoverage: 0.98, minCanaryMembers: 200, maxComplaintRatio: 1.0 };

const NEXT: Record<ProposalStage, ProposalStage[]> = {
  proposed: ['evaluated', 'rejected'],
  evaluated: ['shadow', 'rejected'],
  shadow: ['canary', 'rejected'],
  canary: ['approved', 'rejected', 'rolled_back'],
  approved: ['live', 'rejected'],
  live: ['rolled_back'],
  rolled_back: [],
  rejected: [],
};

export function canMove(from: ProposalStage, to: ProposalStage): boolean {
  return NEXT[from].includes(to);
}

/** Gate 1: offline evaluation on the frozen eval set. */
export function passesEval(r: EvalReport): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (r.candidateScore < r.baselineScore + THRESHOLDS.minUplift) reasons.push('no meaningful improvement over baseline');
  if (r.guardrailRegressions > 0) reasons.push(`${r.guardrailRegressions} new guardrail violations`);
  if (r.sourceCoverage < THRESHOLDS.minSourceCoverage) reasons.push('numbers without sources');
  return { pass: reasons.length === 0, reasons };
}

/** Gate 3: canary on a small share of members. Gate 4 (approval) is always a named human. */
export function passesCanary(c: CanaryReport): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (c.members < THRESHOLDS.minCanaryMembers) reasons.push('not enough canary members yet');
  if (c.guardrailFlags > 0) reasons.push('guardrail flags during canary');
  if (c.baselineComplaintRate > 0 && c.complaintRate / c.baselineComplaintRate > THRESHOLDS.maxComplaintRatio) reasons.push('more complaints than baseline');
  return { pass: reasons.length === 0, reasons };
}

/** Changes that touch minors, advice limits or politics always need a second human approver. */
export function needsSecondApprover(touches: string[]): boolean {
  return touches.some((t) => ['minors', 'advice', 'politics', 'emotion'].includes(t));
}
