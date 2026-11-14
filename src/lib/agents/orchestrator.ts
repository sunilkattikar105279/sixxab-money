import Anthropic from '@anthropic-ai/sdk';
import { BASE_RULES, DOMAINS, ROUTER_PROMPT, type Domain } from './domains';
import { guard, type GuardContext } from './guardrail';
import { runTool, toolSchemas } from './tools';
import { handshake, envelope, type Envelope } from './handshake';
import { detectSignals, plan as emotionPlan, toneInstruction, type Mood, type EmotionPlan } from '../emotion';

export interface AskInput {
  question: string;
  memberId?: string;
  ctx: GuardContext;
  mood?: Mood;
}

export interface AskResult {
  answer: string;
  domain: Domain;
  sources: { name: string; asOf?: string }[];
  flags: string[];
  model: string;
  confidence?: string;
  emotion: EmotionPlan & { signals: string[] };
  handshakes: { envelope: Envelope; accepted: boolean; reason?: string }[];
  consulted?: Domain | null;
  videos: { title: string; url: string }[];
}

const routerModel = () => process.env.SIXXAB_ROUTER_MODEL || 'claude-haiku-5-5';
const answerModel = () => process.env.SIXXAB_ANSWER_MODEL || 'claude-sonnet-5-5';

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic();
}

export async function route(question: string): Promise<{ domain: Domain; also?: Domain | null; country: string }> {
  const res = await client().messages.create({
    model: routerModel(),
    max_tokens: 60,
    system: ROUTER_PROMPT,
    messages: [{ role: 'user', content: question }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (parsed.domain in DOMAINS) return { domain: parsed.domain, also: parsed.also && parsed.also in DOMAINS && parsed.also !== parsed.domain ? parsed.also : null, country: parsed.country };
  } catch {
    /* fall through */
  }
  return { domain: 'tutor', country: 'GLOBAL' };
}

/** Assess → route → answer with tools → guardrail. Every step is recorded by the caller in the transparency ledger. */
export async function ask({ question, memberId, ctx, mood }: AskInput): Promise<AskResult> {
  const handshakes: AskResult['handshakes'] = [];
  const call = (to: Envelope['to'], intent: string, payload: Record<string, unknown>) => {
    const env = envelope('orchestrator', to, intent, payload, memberId);
    const r = handshake(env);
    handshakes.push({ envelope: env, ...r });
    if (!r.accepted) throw new Error(`Handshake refused: ${r.reason}`);
  };

  // 1. Calm agent reads emotion first, so the answer meets the member where they are.
  call('calm', 'assess', { mood: mood ?? null });
  const signals = detectSignals(question);
  const emo = emotionPlan(signals, mood);

  // Distress: no market content, no model call; support first.
  if (emo.escalate) {
    call('guardrail', 'review', { domain: 'coach' });
    return { answer: emo.preface ?? '', domain: 'coach', sources: [], flags: ['distress_support'], model: 'rules', emotion: { ...emo, signals }, handshakes, videos: [] };
  }

  // 2. Route to a domain agent.
  const { domain, also } = await route(question);
  const agent = DOMAINS[domain];
  call(domain, 'answer', { question });
  const tools = toolSchemas(agent.tools);
  const sources: AskResult['sources'] = [];
  const vids: AskResult['videos'] = [];

  // 2b. Consult a second agent for facts when the router asks for one (e.g. coach + markets).
  let notes = '';
  if (also) {
    call(also, 'answer', { question, purpose: 'facts' });
    const helper = DOMAINS[also];
    const r = await toolLoop(`${helper.prompt}\n\nGive only the relevant facts in 3 bullets, with sources. No advice.`, question, toolSchemas(helper.tools), memberId, sources, vids, 2);
    notes = `\n\nFacts from the ${helper.label} agent:\n${r}`;
  }

  const system = `${agent.prompt}\n\n${BASE_RULES}\nTone: ${toneInstruction(emo)}\nMember context: country=${ctx.country}, minor=${ctx.isMinor}.${notes}`;
  const final = await toolLoop(system, question, tools, memberId, sources, vids, 4);

  // 3. Guardrail reviews every answer before the member sees it.
  call('guardrail', 'review', { domain });
  const g = guard(final || 'I could not find an answer to that yet.', ctx);
  const answer = emo.preface ? `${emo.preface}\n\n${g.text}` : g.text;
  const confidence = /confidence:\s*(high|medium|low)/i.exec(final)?.[1]?.toLowerCase();
  return { answer, domain, sources, flags: g.flags, model: answerModel(), confidence, emotion: { ...emo, signals }, handshakes, consulted: also ?? null, videos: dedupe(vids) };
}

const dedupe = (v: AskResult['videos']) => v.filter((x, i) => v.findIndex((y) => y.url === x.url) === i).slice(0, 2);

/** Runs one agent with its tools until it stops calling them (or the turn limit). Collects sources and videos. */
async function toolLoop(system: string, question: string, tools: Anthropic.Tool[], memberId: string | undefined, sources: AskResult['sources'], vids: AskResult['videos'], maxTurns: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];
  let final = '';
  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await client().messages.create({ model: answerModel(), max_tokens: 900, system, ...(tools.length ? { tools } : {}), messages });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    final = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    if (res.stop_reason !== 'tool_use' || toolUses.length === 0) break;
    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await runTool(tu.name, tu.input as Record<string, unknown>, { memberId });
      sources.push(...out.sources);
      if (out.videos) vids.push(...out.videos);
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out.data) });
    }
    messages.push({ role: 'user', content: results });
  }
  return final;
}
