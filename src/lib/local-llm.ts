// Local LLM brain — run JARVIS entirely on your own machine via Ollama
// (llama 3.1 / 3.2, Qwen, Mistral, etc.). No API, no cloud, no cost.
//
// .env.local:
//   LOCAL_LLM_URL=http://127.0.0.1:11434   (Ollama's default)
//   LOCAL_LLM_MODEL=llama3.1                (any tool-capable model)
//
// When LOCAL_LLM_URL is set it takes priority over the Anthropic API.
// We translate JARVIS's Anthropic-style messages/tools to Ollama's
// OpenAI-flavored chat API and translate the reply back into the same
// {type:"text"|"tool_use"} content blocks the client already handles, so
// nothing else in the app changes.

interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// Minimal shapes for the content blocks we exchange with the client
type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string }
  | { type: string; [k: string]: unknown };

interface Msg {
  role: "user" | "assistant";
  content: string | Block[];
}

export function localLlmConfigured() {
  return !!process.env.LOCAL_LLM_URL;
}

interface OllamaMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
  tool_name?: string;
}

function toOllamaMessages(system: string, messages: Msg[]): OllamaMsg[] {
  const out: OllamaMsg[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const text = m.content.filter((b): b is { type: "text"; text: string } => b.type === "text").map((b) => b.text).join("");
      const toolUses = m.content.filter((b): b is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } => b.type === "tool_use");
      out.push({
        role: "assistant",
        content: text,
        ...(toolUses.length && {
          tool_calls: toolUses.map((t) => ({ function: { name: t.name, arguments: t.input } })),
        }),
      });
    } else {
      // user turn: either plain text blocks or tool_result blocks
      const toolResults = m.content.filter((b): b is { type: "tool_result"; tool_use_id: string; content: string } => b.type === "tool_result");
      if (toolResults.length) {
        for (const tr of toolResults) {
          out.push({ role: "tool", content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content) });
        }
      } else {
        const text = m.content.filter((b): b is { type: "text"; text: string } => b.type === "text").map((b) => b.text).join("");
        out.push({ role: "user", content: text });
      }
    }
  }
  return out;
}

let counter = 0;
const nextId = () => `call_${Date.now().toString(36)}_${counter++}`;

export async function runLocalLlm(
  system: string,
  messages: Msg[],
  tools: ToolDef[]
): Promise<{ type: "message"; content: Block[]; stop_reason: string } | { type: "error"; error: string }> {
  const base = process.env.LOCAL_LLM_URL!.replace(/\/$/, "");
  const model = process.env.LOCAL_LLM_MODEL || "llama3.1";

  const body = {
    model,
    messages: toOllamaMessages(system, messages),
    tools: tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    })),
    stream: false,
    options: { temperature: 0.4, num_ctx: 8192 },
  };

  let data: {
    message?: { content?: string; tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[] };
    error?: string;
  };
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    data = await res.json();
    if (!res.ok) return { type: "error", error: data?.error || `Local LLM HTTP ${res.status}` };
  } catch (e) {
    return {
      type: "error",
      error: `Can't reach local LLM at ${base}. Is Ollama running? (ollama serve, then \`ollama pull ${model}\`). ${String(e).slice(0, 80)}`,
    };
  }

  const msg = data.message ?? {};
  const content: Block[] = [];
  if (msg.content?.trim()) content.push({ type: "text", text: msg.content });
  const calls = msg.tool_calls ?? [];
  for (const c of calls) {
    content.push({
      type: "tool_use",
      id: nextId(),
      name: c.function.name,
      input: typeof c.function.arguments === "string" ? safeParse(c.function.arguments) : c.function.arguments,
    });
  }
  if (!content.length) content.push({ type: "text", text: "…" });

  return {
    type: "message",
    content,
    stop_reason: calls.length ? "tool_use" : "end_turn",
  };
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
