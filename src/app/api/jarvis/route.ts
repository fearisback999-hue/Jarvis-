// Stateless LLM proxy. The client holds the conversation and executes tools
// locally; this route only forwards one turn to Claude and returns the raw
// content blocks. No personal data is stored server-side.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { JARVIS_SYSTEM_PROMPT, JARVIS_TOOLS } from "@/lib/jarvis-tools";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ type: "no_key" });
  }

  const { messages, context } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
    context?: string;
  };

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: JARVIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ...(context ? [{ type: "text" as const, text: `Live context snapshot:\n${context}` }] : []),
      ],
      tools: JARVIS_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      })),
      messages,
    });

    return NextResponse.json({
      type: "message",
      content: response.content,
      stop_reason: response.stop_reason,
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ type: "error", error: "Invalid API key" }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ type: "error", error: "Rate limited — try again shortly" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ type: "error", error: error.message }, { status: 502 });
    }
    return NextResponse.json({ type: "error", error: "Unexpected error" }, { status: 500 });
  }
}
