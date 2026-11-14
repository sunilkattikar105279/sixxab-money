// Money-emotions layer. People make their worst money moves when scared, ashamed or euphoric.
// The Calm agent reads emotion signals, adapts tone, and adds a cooling-off step before big, hard-to-undo moves.
// This is coaching, not therapy: distress language routes the member to human support.

export type Mood = 1 | 2 | 3 | 4 | 5; // 1 = very stressed, 5 = calm/confident
export type Signal = 'panic' | 'fomo' | 'shame' | 'anxiety' | 'avoidance' | 'distress';
export type Tone = 'steady' | 'reassure' | 'slow_down' | 'celebrate' | 'support';

const LEXICON: Record<Signal, RegExp[]> = {
  panic: [/\b(sell|dump|get out of) (everything|it all|all my)\b/i, /\bmarket is crashing\b/i, /\bpanic\b/i, /\bbefore it goes to zero\b/i],
  fomo: [/\b(all in|yolo|can'?t miss|missing out|fomo)\b/i, /\bgo all[- ]in\b/i, /\bget rich (quick|fast)\b/i],
  shame: [/\b(i'?m|i am) (so )?(stupid|an idiot|terrible with money|a failure)\b/i, /\bembarrass(ed|ing)\b/i],
  anxiety: [/\b(worried|anxious|scared|afraid|stressed|can'?t sleep)\b/i],
  avoidance: [/\b(don'?t want to (look|check)|haven'?t opened|ignoring (my|the) (bills|statements))\b/i],
  distress: [/\b(hopeless|no way out|can'?t go on|want to give up on everything)\b/i],
};

export function detectSignals(text: string): Signal[] {
  return (Object.keys(LEXICON) as Signal[]).filter((s) => LEXICON[s].some((re) => re.test(text)));
}

export interface EmotionPlan {
  tone: Tone;
  coolingOffHours: number; // 0 = none
  preface?: string;
  escalate: boolean; // offer human support resources
}

/** Decide how the agent should respond given mood (optional, self-reported) and detected signals. */
export function plan(signals: Signal[], mood?: Mood): EmotionPlan {
  if (signals.includes('distress')) {
    return { tone: 'support', coolingOffHours: 72, escalate: true, preface: 'That sounds really heavy. Money stress is common and it can get better. You don’t have to sort this alone: talking to someone you trust, or a support line, can help right now.' };
  }
  if (signals.includes('panic')) {
    return { tone: 'slow_down', coolingOffHours: 24, escalate: false, preface: 'Big drops feel scary. Before any move you can’t undo, let’s look at the facts together and wait 24 hours.' };
  }
  if (signals.includes('fomo')) {
    return { tone: 'slow_down', coolingOffHours: 24, escalate: false, preface: 'When something feels like a can’t-miss chance, that’s the moment to slow down. Let’s check the risks first.' };
  }
  if (signals.includes('shame')) {
    return { tone: 'reassure', coolingOffHours: 0, escalate: false, preface: 'Most people were never taught this. Starting now is what counts.' };
  }
  if (signals.includes('anxiety') || signals.includes('avoidance') || (mood !== undefined && mood <= 2)) {
    return { tone: 'reassure', coolingOffHours: 0, escalate: false, preface: 'Let’s take one small, clear step at a time.' };
  }
  if (mood === 5) return { tone: 'celebrate', coolingOffHours: 0, escalate: false };
  return { tone: 'steady', coolingOffHours: 0, escalate: false };
}

/** Instruction appended to the answering agent's system prompt. */
export function toneInstruction(p: EmotionPlan): string {
  const base: Record<Tone, string> = {
    steady: 'Use a calm, clear, factual tone.',
    reassure: 'Use a warm, reassuring tone. Normalise the feeling, then give one small next step.',
    slow_down: 'Gently slow the member down. Show facts and history, list what could go wrong either way, and suggest waiting before acting. Do not tell them what to do.',
    celebrate: 'Acknowledge their progress briefly, then keep it grounded.',
    support: 'Lead with empathy, keep money detail minimal, and encourage reaching out to a trusted person or a support line. Do not give investment content.',
  };
  return base[p.tone] + (p.coolingOffHours ? ` Suggest a ${p.coolingOffHours}-hour cooling-off period before any irreversible money move.` : '');
}
