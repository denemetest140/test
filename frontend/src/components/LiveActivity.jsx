// LiveActivity: gerçek platform işlemlerinden anonim akış.
// Hiçbir sahte/random veri kullanmaz. Veri yoksa "Henüz canlı işlem yok" gösterilir.
import { useEffect, useState } from "react";
import { ChartLineUp, X } from "@phosphor-icons/react";
import { api, formatTRY } from "../lib/api";

function maskName(email) {
  if (!email || typeof email !== "string") return "Kullanıcı";
  const local = email.split("@")[0] || "";
  if (local.length === 0) return "Kullanıcı";
  return local[0].toUpperCase() + (local.length > 1 ? "***" : "***");
}

export default function LiveActivity() {
  const [events, setEvents] = useState([]);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (closed) return;
    let cancelled = false;
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/platform/recent-trades?limit=5");
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchEvents();
    const t = setInterval(fetchEvents, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [closed]);

  if (closed) return null;
  // Only show widget when we actually have events, to avoid clutter.
  if (!loaded || events.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-24 right-4 lg:right-6 z-30 hidden sm:block pointer-events-none">
      <div className="pointer-events-auto card-surface backdrop-blur-xl w-[280px] p-3 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse-green"/>
            CANLI İŞLEM AKIŞI
          </div>
          <button onClick={() => setClosed(true)} className="text-[#64748B] hover:text-[#0F172A]" data-testid="live-close" aria-label="Kapat"><X size={12}/></button>
        </div>
        <div className="space-y-1.5">
          {events.map((e) => {
            const buy = e.side === "buy";
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs anim-fade-up">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${buy?"bg-green-50 text-[#16A34A]":"bg-red-50 text-[#DC2626]"}`}>
                  <ChartLineUp size={11} weight="bold"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[#0F172A]">
                    <span className="font-medium">{maskName(e.user_label)}</span>
                    <span className="text-[#64748B]"> · </span>
                    <span className={buy?"text-[#16A34A]":"text-[#DC2626]"}>{e.symbol} {buy ? "aldı" : "sattı"}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B] tabular">{formatTRY(e.amount_try, 2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
