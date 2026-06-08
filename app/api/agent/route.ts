import Anthropic from '@anthropic-ai/sdk';
import { AGENT_ROSTER } from '@/lib/osama-context';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5';

type Step = { agent: string; title: string; detail: string };
type Plan = { summary: string; steps: Step[] };

// Deterministic scripted plan used when no API key is present.
function scriptedPlan(task: string): Plan {
  const t = task.slice(0, 120);
  return {
    summary: `Decomposed "${t}" into a 5-agent pipeline — the kind of automation Osama designs and ships.`,
    steps: [
      { agent: 'ORCHESTRATOR', title: 'Frame the goal', detail: `Clarify scope and success criteria for: ${t}` },
      { agent: 'RESEARCH', title: 'Gather context', detail: 'Pull the data, docs, and prior art the task depends on.' },
      { agent: 'DATA', title: 'Model the inputs', detail: 'Normalize and structure the data into a usable shape.' },
      { agent: 'BUILD', title: 'Produce the artifact', detail: 'Generate the solution — code, report, workflow, or model.' },
      { agent: 'REVIEW', title: 'Verify & ship', detail: 'Check correctness, then hand off the result.' },
    ],
  };
}

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          agent: { type: 'string', enum: [...AGENT_ROSTER] },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['agent', 'title', 'detail'],
      },
    },
  },
  required: ['summary', 'steps'],
} as const;

export async function POST(request: Request) {
  let body: { task?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const task = (body.task || '').toString().trim().slice(0, 400);
  if (!task) return Response.json({ error: 'Provide a task to decompose.' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(scriptedPlan(task));
  }

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        `You are an AI orchestrator. Decompose the user's task into 4–6 sequential steps, ` +
        `assigning each to one agent from this roster: ${AGENT_ROSTER.join(', ')}. ` +
        `The first step is always ORCHESTRATOR. Keep each title ≤ 5 words and each detail ≤ 18 words. ` +
        `Write a one-sentence summary. Be concrete and grounded in the actual task.`,
      messages: [{ role: 'user', content: `Task: ${task}` }],
      output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    });

    const textBlock = res.content.find((b) => b.type === 'text');
    const plan = textBlock && 'text' in textBlock ? (JSON.parse(textBlock.text) as Plan) : scriptedPlan(task);
    return Response.json(plan);
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : 500;
    // Degrade to the scripted plan rather than failing the UI.
    return Response.json(scriptedPlan(task), { status: status && status >= 500 ? 200 : 200 });
  }
}
