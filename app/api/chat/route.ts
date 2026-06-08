import Anthropic from '@anthropic-ai/sdk';
import { OSAMA_BIO, fallbackReply } from '@/lib/osama-context';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Public, anonymous endpoint → default to a fast/cheap model. Override with
// CHAT_MODEL (e.g. CHAT_MODEL=claude-opus-4-8) to upgrade.
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const enc = new TextEncoder();

function streamText(text: string): Response {
  // Chunk a static string so the fallback path "streams" like the live one.
  const stream = new ReadableStream({
    start(controller) {
      const words = text.split(' ');
      let i = 0;
      const tick = () => {
        if (i >= words.length) {
          controller.close();
          return;
        }
        controller.enqueue(enc.encode(words[i] + (i < words.length - 1 ? ' ' : '')));
        i++;
        setTimeout(tick, 18);
      };
      tick();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  let body: { messages?: ChatMsg[] };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  // Sanitize + cap history to keep cost and abuse bounded.
  const messages: ChatMsg[] = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-16);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return new Response('Last message must be from the user.', { status: 400 });
  }

  const lastUser = messages[messages.length - 1].content;

  // Graceful fallback — no key configured: scripted assistant, still streams.
  if (!process.env.ANTHROPIC_API_KEY) {
    return streamText(fallbackReply(lastUser));
  }

  const client = new Anthropic();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llm = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: [
            { type: 'text', text: OSAMA_BIO, cache_control: { type: 'ephemeral' } },
          ],
          messages,
        });
        llm.on('text', (delta) => controller.enqueue(enc.encode(delta)));
        await llm.finalMessage();
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Anthropic.APIError
            ? `\n[assistant error ${err.status}: ${err.message}]`
            : '\n[assistant is unavailable right now — reach Osama on LinkedIn: linkedin.com/in/osamaalahmad]';
        controller.enqueue(enc.encode(msg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
