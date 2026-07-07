"use client";

import { useState } from "react";
import { useJarvis, financeSummary } from "@/lib/store";
import type { Listing } from "@/lib/store";
import { fmtMoney } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Badge, EmptyState, Select } from "@/components/ui";
import { Trash2 } from "lucide-react";

const STATE_BADGE: Record<Listing["state"], string> = {
  draft: "bg-zinc-800 text-zinc-300",
  queued: "bg-amber-500/15 text-amber-400",
  published: "bg-emerald-500/15 text-emerald-400",
};

export default function EtsyPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");

  if (!mounted) return null;

  const fin = financeSummary(s.transactions);
  const queue = s.listings;

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Etsy" subtitle="Listing factory: SEO, tags, publishing queue, profit." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Etsy revenue (mo)" value={fmtMoney(fin.bySource.etsy)} accent="#10b981" />
        <StatCard label="Drafts" value={queue.filter((l) => l.state === "draft").length} />
        <StatCard label="Queued" value={queue.filter((l) => l.state === "queued").length} />
        <StatCard label="Published" value={queue.filter((l) => l.state === "published").length} />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">New listing draft</h2>
        <div className="flex flex-col gap-2">
          <Input placeholder="Listing title (front-load SEO keywords, ~130 chars)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Tags, comma-separated (max 13)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <Button
              onClick={() => {
                if (!title.trim()) return;
                s.addListing({
                  title: title.trim(),
                  tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 13),
                  state: "draft",
                });
                setTitle(""); setTags("");
              }}
            >
              Draft
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Publishing queue</h2>
        {queue.length === 0 ? (
          <EmptyState>
            No listings yet. Ask JARVIS: &quot;draft 5 Etsy listings for Islamic wall art&quot; — titles, descriptions and 13 tags each.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.map((l) => (
              <li key={l.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{l.title}</span>
                  {l.price != null && <span className="tabular text-[12px] text-zinc-400">{fmtMoney(l.price, 2)}</span>}
                  <Select value={l.state} onChange={(e) => s.updateListing(l.id, { state: e.target.value as Listing["state"] })} className="py-1 text-[12px]">
                    <option value="draft">draft</option>
                    <option value="queued">queued</option>
                    <option value="published">published</option>
                  </Select>
                  <Badge className={STATE_BADGE[l.state]}>{l.state}</Badge>
                  <button onClick={() => s.deleteListing(l.id)} className="text-zinc-700 hover:text-rose-400" aria-label="Delete listing">
                    <Trash2 size={13} />
                  </button>
                </div>
                {l.description && <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">{l.description}</p>}
                {l.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {l.tags.map((t, i) => (
                      <span key={i} className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">{t}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/[0.04] text-[13px] text-zinc-400">
        <span className="font-medium text-amber-300">Publishing note:</span> actual publishing to Etsy (via the Etsy/Printify APIs) is
        Phase 2 of the roadmap and will always require your confirmation per listing — see docs/05-automation-architecture.md.
      </Card>
    </div>
  );
}
