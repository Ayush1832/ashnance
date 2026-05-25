import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { socket, mockBurnFeed } from "@/lib/socketClient";
import { timeAgo } from "@/lib/format";
import type { BurnEvent } from "@/lib/types";

export function LiveBurnFeed({ max = 12 }: { max?: number }) {
  const [feed, setFeed] = useState<BurnEvent[]>(mockBurnFeed.slice(0, max));
  const [, force] = useState(0);

  useEffect(() => {
    const off = socket.on("burn:new", (b: BurnEvent) => {
      setFeed((prev) => [b, ...prev].slice(0, max));
    });
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => { off(); clearInterval(t); };
  }, [max]);

  return (
    <div className="space-y-1.5">
      {feed.map((b) => (
        <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-md glass text-sm animate-slide-in-top">
          <Flame className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">
            <span className="font-medium">{b.username}</span>{" "}
            <span className="text-muted-foreground">burned</span>{" "}
            <span className="font-mono text-[oklch(0.7_0.13_245)]">${b.amount}</span>
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground font-mono whitespace-nowrap">
            +{b.weight} w · +{b.ash} ASH · {timeAgo(b.at)}
          </span>
        </div>
      ))}
    </div>
  );
}
