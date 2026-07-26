import { Phone, Video } from "lucide-react";
import { getCurrentClient, messagesForClient } from "@/lib/data";
import { Card, PageHeader } from "@/components/primitives";
import { MessageThread } from "@/components/MessageThread";

export default function MessagesPage() {
  const client = getCurrentClient();
  const messages = messagesForClient(client.id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Direct line" title="Messages" subtitle="1:1 with your coach — usually replies within a few hours." />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blood-500 to-blood-700 text-sm font-bold text-white">
              SL
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-500" />
            </span>
            <div>
              <div className="text-sm font-semibold text-white">Shane Lanteigne</div>
              <div className="text-xs text-emerald-400">Online · Head Coach</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5" aria-label="Call">
              <Phone className="h-[18px] w-[18px]" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5" aria-label="Video">
              <Video className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <MessageThread initial={messages} />
      </Card>
    </div>
  );
}
