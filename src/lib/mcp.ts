// MCP client layer — link any Model Context Protocol server into JARVIS.
//
// Configure servers in mcp-servers.json at the repo root:
//   { "servers": [
//       { "name": "zapier", "url": "https://mcp.zapier.com/api/mcp/s/XXX/mcp" },
//       { "name": "mytools", "url": "http://localhost:9200/mcp",
//         "headers": { "Authorization": "Bearer ..." } }
//   ] }
//
// Every tool each server exposes becomes a JARVIS tool named
// mcp__<server>__<tool>; the model can call them like native tools and
// the client executor routes the call back through POST /api/mcp.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface McpServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

export interface McpToolDef {
  name: string; // mcp__server__tool
  description: string;
  input_schema: Record<string, unknown>;
}

export function loadServerConfigs(): McpServerConfig[] {
  try {
    const raw = readFileSync(join(process.cwd(), "mcp-servers.json"), "utf8");
    const parsed = JSON.parse(raw) as { servers?: McpServerConfig[] };
    return (parsed.servers ?? []).filter((s) => s.name && s.url);
  } catch {
    return [];
  }
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

async function connect(cfg: McpServerConfig): Promise<Client> {
  const client = new Client({ name: "jarvis", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(cfg.url), {
    requestInit: { headers: cfg.headers },
  });
  await client.connect(transport);
  return client;
}

export interface McpServerStatus {
  name: string;
  url: string;
  ok: boolean;
  tools: { name: string; description: string }[];
  error?: string;
}

export async function listMcpStatus(): Promise<McpServerStatus[]> {
  const configs = loadServerConfigs();
  return Promise.all(
    configs.map(async (cfg) => {
      try {
        const client = await connect(cfg);
        const { tools } = await client.listTools();
        await client.close().catch(() => {});
        return {
          name: cfg.name, url: cfg.url, ok: true,
          tools: tools.map((t) => ({ name: t.name, description: t.description ?? "" })),
        };
      } catch (e) {
        return { name: cfg.name, url: cfg.url, ok: false, tools: [], error: String(e).slice(0, 160) };
      }
    })
  );
}

// Tool definitions for the Anthropic tools array — cached briefly so every
// chat turn doesn't re-handshake each server.
let toolCache: { at: number; defs: McpToolDef[] } | null = null;

export async function getMcpToolDefs(): Promise<McpToolDef[]> {
  if (toolCache && Date.now() - toolCache.at < 60_000) return toolCache.defs;
  const statuses = await listMcpStatus();
  const defs: McpToolDef[] = [];
  for (const s of statuses) {
    if (!s.ok) continue;
    const cfg = loadServerConfigs().find((c) => c.name === s.name)!;
    try {
      const client = await connect(cfg);
      const { tools } = await client.listTools();
      await client.close().catch(() => {});
      for (const t of tools) {
        defs.push({
          name: `mcp__${sanitize(s.name)}__${sanitize(t.name)}`.slice(0, 128),
          description: `[MCP · ${s.name}] ${t.description ?? t.name}`.slice(0, 1024),
          input_schema: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
        });
      }
    } catch {
      /* server flaked between list and connect — skip */
    }
  }
  toolCache = { at: Date.now(), defs };
  return defs;
}

export async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const cfg = loadServerConfigs().find((c) => sanitize(c.name) === serverName);
  if (!cfg) return { ok: false, error: `No MCP server named "${serverName}" in mcp-servers.json` };
  try {
    const client = await connect(cfg);
    // resolve the real (unsanitized) tool name
    const { tools } = await client.listTools();
    const real = tools.find((t) => sanitize(t.name) === toolName)?.name ?? toolName;
    const result = await client.callTool({ name: real, arguments: args });
    await client.close().catch(() => {});
    const content = (result.content as { type: string; text?: string }[] | undefined) ?? [];
    const text = content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return { ok: !result.isError, result: text || result.structuredContent || content };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}
