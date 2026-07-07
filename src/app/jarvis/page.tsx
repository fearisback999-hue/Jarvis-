"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useJarvis } from "@/lib/store";
import { executeJarvisTool, localPlanner } from "@/lib/jarvis-executor";
import { useVoice } from "@/hooks/use-voice";
import { useMounted } from "@/hooks/use-mounted";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Send, Sparkles, Wrench } from "lucide-react";

// Minimal wire types for the Anthropic content blocks we handle client-side
interface TextBlock { type: "text"; text: string }
interface ToolUseBlock { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
type ContentBlock = TextBlock | ToolUseBlock | { type: string };
interface ApiMessage { role: "user" | "assistant"; content: ContentBlock[] | string }

interface ChatMessage {
  role: "user" | "jarvis";
  text: string;
  tools?: string[];
}

const SUGGESTIONS = [
  "How much money did I make this month?",
  "Run the POD pipeline",
  "Find winning products for gym accessories",
  "Open Chrome",
  "Plan my day",
  "When is the next prayer?",
];

export default function JarvisPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const apiMessagesRef = useRef<ApiMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, busy]);

  const runAgentLoop = useCallback(async (userText: string): Promise<string> => {
    apiMessagesRef.current.push({ role: "user", content: userText });
    const context = `Now: ${new Date().toString()}. User: ${useJarvis.getState().profile.name}.`;
    const toolsUsed: string[] = [];

    for (let i = 0; i < 8; i++) {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessagesRef.current, context }),
      });
      const data = await res.json();

      if (data.type === "no_key") {
        apiMessagesRef.current.pop(); // local planner keeps no API history
        const reply = await localPlanner(userText);
        setChat((c) => [...c, { role: "jarvis", text: reply }]);
        return reply;
      }
      if (data.type === "error") {
        const reply = `Something went wrong: ${data.error}`;
        setChat((c) => [...c, { role: "jarvis", text: reply }]);
        return reply;
      }

      const content = data.content as ContentBlock[];
      apiMessagesRef.current.push({ role: "assistant", content });

      if (data.stop_reason === "tool_use") {
        const toolBlocks = content.filter((b): b is ToolUseBlock => b.type === "tool_use");
        const results = [];
        for (const block of toolBlocks) {
          toolsUsed.push(block.name);
          useJarvis.getState().logAgent("JARVIS", `${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);
          let result: Record<string, unknown>;
          try {
            result = await executeJarvisTool(block.name, block.input);
          } catch (e) {
            result = { ok: false, error: String(e) };
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }
        apiMessagesRef.current.push({ role: "user", content: results as unknown as ContentBlock[] });
        continue;
      }

      const text = content.filter((b): b is TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      const reply = text || "Done.";
      setChat((c) => [...c, { role: "jarvis", text: reply, tools: toolsUsed.length ? [...toolsUsed] : undefined }]);
      return reply;
    }
    const fallback = "I hit my step limit on that one — try breaking the request down.";
    setChat((c) => [...c, { role: "jarvis", text: fallback }]);
    return fallback;
  }, []);

  const send = useCallback(
    async (text: string): Promise<string> => {
      const clean = text.trim();
      if (!clean) return "";
      setChat((c) => [...c, { role: "user", text: clean }]);
      setInput("");
      setBusy(true);
      try {
        return await runAgentLoop(clean);
      } finally {
        setBusy(false);
      }
    },
    [runAgentLoop]
  );

  const voice = useVoice(send);

  if (!mounted) return null;

  return (
    <div className="fade-up flex h-[calc(100vh-6rem)] flex-col md:h-[calc(100vh-3rem)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles size={18} className="text-emerald-400" /> JARVIS
          </h1>
          <p className="text-[12px] text-zinc-500">
            {voice.state === "wake" && `Listening for "Hey Jarvis"…`}
            {voice.state === "listening" && "Listening…"}
            {voice.state === "speaking" && "Speaking…"}
            {(voice.state === "off" || voice.state === "unsupported") && "Your operator. Text or voice."}
          </p>
        </div>
        <Button
          variant={voice.state === "off" || voice.state === "unsupported" ? "ghost" : "primary"}
          className={cn(voice.state === "wake" || voice.state === "listening" ? "voice-pulse" : "")}
          onClick={() => (voice.state === "off" || voice.state === "unsupported" ? voice.start() : voice.stop())}
          title={voice.supported ? "Toggle voice mode" : "Voice needs a Chromium browser"}
        >
          {voice.state === "off" || voice.state === "unsupported" ? <MicOff size={14} /> : <Mic size={14} />}
          {voice.state === "off" || voice.state === "unsupported" ? "Voice off" : "Voice on"}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
        {chat.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-[13px] text-zinc-600">
              Ask anything — JARVIS reads your real data and takes action.
            </p>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:border-emerald-600/50 hover:text-zinc-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {chat.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] fade-up", m.role === "user" ? "self-end" : "self-start")}>
              {m.tools && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {m.tools.map((t, j) => (
                    <span key={j} className="flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-400">
                      <Wrench size={9} /> {t}
                    </span>
                  ))}
                </div>
              )}
              <div
                className={cn(
                  "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                  m.role === "user" ? "bg-emerald-600/90 text-white" : "border border-white/[0.07] bg-[#141416] text-zinc-200"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 self-start rounded-2xl border border-white/[0.07] bg-[#141416] px-3.5 py-2.5 text-[13px] text-zinc-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              thinking…
            </div>
          )}
          {voice.state === "listening" && voice.transcript && (
            <div className="self-end rounded-2xl bg-emerald-600/40 px-3.5 py-2 text-[13px] italic text-emerald-100">
              {voice.transcript}
            </div>
          )}
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message JARVIS… (or say "Hey Jarvis")`}
          className="flex-1 rounded-xl border border-white/[0.08] bg-[#111113] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-zinc-600 focus:border-emerald-600/60"
        />
        <Button type="submit" disabled={busy || !input.trim()} className="rounded-xl px-4">
          <Send size={14} />
        </Button>
      </form>
      {chat.length === 0 && (
        <Card className="mt-3 border-white/[0.05] bg-[#0d0d0f] py-2.5 text-[12px] text-zinc-600">
          No API key? JARVIS still handles scheduling, prayers, tasks and money in offline mode. Add{" "}
          <code className="text-zinc-400">ANTHROPIC_API_KEY</code> to <code className="text-zinc-400">.env.local</code> for the full agentic brain.
        </Card>
      )}
    </div>
  );
}
