"use client";

import { useState } from "react";
import { useJarvis, financeSummary } from "@/lib/store";
import type { Product } from "@/lib/store";
import { fmtMoney } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, Badge, EmptyState } from "@/components/ui";
import { Trash2 } from "lucide-react";

const STATUS_BADGE: Record<Product["status"], string> = {
  research: "bg-zinc-800 text-zinc-300",
  testing: "bg-amber-500/15 text-amber-400",
  winning: "bg-emerald-500/15 text-emerald-400",
  live: "bg-sky-500/15 text-sky-400",
  killed: "bg-rose-500/15 text-rose-400",
};

export default function TikTokPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [name, setName] = useState("");
  const [hook, setHook] = useState("");

  if (!mounted) return null;

  const products = s.products.filter((p) => p.platform === "tiktok");
  const fin = financeSummary(s.transactions);
  const posted = s.content.filter((c) => c.posted).length;

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="TikTok Shop" subtitle="Winning products, content engine, growth." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="TikTok revenue (mo)" value={fmtMoney(fin.bySource.tiktok)} accent="#10b981" />
        <StatCard label="Products tracked" value={products.length} sub={`${products.filter((p) => p.status === "winning").length} winning`} />
        <StatCard label="Content ideas" value={s.content.length} sub={`${posted} posted`} />
        <StatCard label="Views (attributed)" value={s.content.reduce((a, c) => a + c.views, 0).toLocaleString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Product pipeline</h2>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Product idea…" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => { if (name.trim()) { s.addProduct({ platform: "tiktok", name: name.trim(), status: "research" }); setName(""); } }}>Add</Button>
          </div>
          {products.length === 0 ? (
            <EmptyState>Add product ideas — or ask JARVIS to research winning products.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <Select
                    value={p.status}
                    onChange={(e) => s.updateProduct(p.id, { status: e.target.value as Product["status"] })}
                    className="py-1 text-[12px]"
                  >
                    {(["research", "testing", "winning", "live", "killed"] as const).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                  <Badge className={STATUS_BADGE[p.status]}>{p.status}</Badge>
                  <button onClick={() => s.deleteProduct(p.id)} className="text-zinc-700 hover:text-rose-400" aria-label="Delete product">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Content calendar</h2>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Hook for the next video…" value={hook} onChange={(e) => setHook(e.target.value)} />
            <Button onClick={() => { if (hook.trim()) { s.addContent({ hook: hook.trim(), posted: false, views: 0, sales: 0 }); setHook(""); } }}>Add</Button>
          </div>
          {s.content.length === 0 ? (
            <EmptyState>No content ideas yet. Ask JARVIS: &quot;write 5 hooks for my product&quot;.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {s.content.slice(0, 12).map((c) => (
                <li key={c.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{c.hook}</span>
                    <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-zinc-500">
                      <input type="checkbox" checked={c.posted} onChange={(e) => s.updateContent(c.id, { posted: e.target.checked })} className="accent-emerald-600" />
                      posted
                    </label>
                  </div>
                  {c.script && <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">{c.script}</p>}
                  {c.caption && <p className="mt-1 truncate text-[12px] text-sky-400/80">{c.caption}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="border-sky-500/20 bg-sky-500/[0.04] text-[13px] text-zinc-400">
        <span className="font-medium text-sky-300">JARVIS tip:</span> ask &quot;research 10 winning TikTok Shop products&quot; or
        &quot;write a script and caption for [product]&quot; in the JARVIS tab — results land here automatically.
      </Card>
    </div>
  );
}
