// MCP bridge: GET lists linked servers + their tools; POST calls a tool.
// Server configs (and any auth headers) stay server-side in mcp-servers.json.

import { NextRequest, NextResponse } from "next/server";
import { listMcpStatus, callMcpTool } from "@/lib/mcp";

export const maxDuration = 60;

export async function GET() {
  const servers = await listMcpStatus();
  return NextResponse.json({ configured: servers.length > 0, servers });
}

export async function POST(req: NextRequest) {
  const { server, tool, args } = (await req.json()) as {
    server: string; tool: string; args?: Record<string, unknown>;
  };
  if (!server || !tool) {
    return NextResponse.json({ ok: false, error: "server and tool required" }, { status: 400 });
  }
  const result = await callMcpTool(server, tool, args ?? {});
  return NextResponse.json(result);
}
