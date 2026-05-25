import { useEffect } from "react";
import { toast } from "sonner";
import { socket } from "@/lib/socketClient";

export function useGlobalToasts() {
  useEffect(() => {
    const offBurn = socket.on("burn:new", (b: any) => {
      // TODO: wire up real socket event
      if (Math.random() < 0.18) {
        toast(`🔥 ${b.username} burned $${b.amount}`, { description: `+${b.weight} weight`, duration: 2500 });
      }
    });
    const offRef = socket.on("referral:earned", (p: any) => {
      toast.success(`💰 You earned $${p.amount} from ${p.username}'s burn!`, { duration: 5000 });
    });
    return () => { offBurn(); offRef(); };
  }, []);
}
