import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { canMove, passesCanary, passesEval, needsSecondApprover, STAGES } from '@/lib/learning/gates';
import { cronAuthorized } from '@/lib/cron';

// Moves a learning proposal one gate forward. Called by the learner job (n8n) for automated gates,
// and by an admin for approval. The database trigger re-checks the order, so this route cannot skip a gate.
const Body = z.object({
  proposalId: z.string().uuid(),
  to: z.enum(STAGES),
  evalReport: z.object({ baselineScore: z.number(), candidateScore: z.number(), guardrailRegressions: z.number(), sourceCoverage: z.number() }).optional(),
  canaryReport: z.object({ members: z.number(), complaintRate: z.number(), baselineComplaintRate: z.number(), guardrailFlags: z.number() }).optional(),
  approver: z.string().email().optional(),
});

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.flatten() }, { status: 400 });
  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 503 });

  const { data: p } = await db.from('learning_proposals').select('id, stage, touches, approvers').eq('id', b.data.proposalId).single();
  if (!p) return NextResponse.json({ error: 'proposal not found' }, { status: 404 });
  if (!canMove(p.stage, b.data.to)) return NextResponse.json({ error: `cannot move from ${p.stage} to ${b.data.to}` }, { status: 409 });

  const update: Record<string, unknown> = { stage: b.data.to };
  if (b.data.to === 'evaluated') {
    if (!b.data.evalReport) return NextResponse.json({ error: 'evalReport required' }, { status: 400 });
    const r = passesEval(b.data.evalReport);
    update.eval_report = { ...b.data.evalReport, ...r };
    if (!r.pass) update.stage = 'rejected';
  }
  if (b.data.to === 'approved') {
    if (!b.data.canaryReport || !b.data.approver) return NextResponse.json({ error: 'canaryReport and approver required' }, { status: 400 });
    const c = passesCanary(b.data.canaryReport);
    if (!c.pass) return NextResponse.json({ error: 'canary gate not passed', reasons: c.reasons }, { status: 409 });
    const approvers = Array.from(new Set([...(p.approvers ?? []), b.data.approver]));
    update.approvers = approvers;
    update.canary_report = { ...b.data.canaryReport, ...c };
    if (needsSecondApprover(p.touches ?? []) && approvers.length < 2) {
      update.stage = 'canary';
      await db.from('learning_proposals').update(update).eq('id', p.id);
      return NextResponse.json({ ok: true, stage: 'canary', note: 'second approver required for minors, advice, politics or emotion changes' });
    }
  }
  const { error } = await db.from('learning_proposals').update(update).eq('id', p.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, stage: update.stage });
}
