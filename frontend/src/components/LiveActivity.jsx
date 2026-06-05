import { useEffect, useState } from "react";
import { ChartLineUp, X } from "@phosphor-icons/react";

const NAMES = ["Ali Y.", "Ayşe D.", "Mehmet T.", "Selin K.", "Burak A.", "Elif M.", "Hakan B.", "Zeynep S.", "Cem O.", "Deniz Ö.", "Berk U.", "Ece N."];
const SYMBOLS = ["BTC", "ETH", "USDT", "SOL", "XRP", "ADA", "DOGE", "BERX", "AVAX", "MATIC"];

function makeEvent() {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const side = Math.random() > 0.5 ? "aldı" : "sattı";
  const amount = (Math.random() * 5000 + 50).toFixed(2);
  return { id: Math.random(), name, sym, side, amount, t: Date.now() };
}

export default function LiveActivity() {
  const [events, setEvents] = useState([]);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;
    setEvents([makeEvent(), makeEvent(), makeEvent()]);
    const t = setInterval(() => {
      setEvents((prev) => [makeEvent(), ...prev].slice(0, 4));
    }, 4500 + Math.random() * 3000);
    return () => clearInterval(t);
  }, [closed]);

  if (closed) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-30 hidden sm:block pointer-events-none">
      <div className="pointer-events-auto card-surface backdrop-blur-xl w-[280px] p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-gold"/>
            CANLI İŞLEM AKIŞI
          </div>
          <button onClick={() => setClosed(true)} className="text-[#94A3B8] hover:text-white" data-testid="live-close"><X size={12}/></button>
        </div>
        <div className="space-y-1.5">
          {events.map((e) => {
            const buy = e.side === "aldı";
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs anim-fade-up">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${buy?"bg-[#10B981]/15 text-[#10B981]":"bg-[#EF4444]/15 text-[#EF4444]"}`}>
                  <ChartLineUp size={11} weight="bold"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-[#94A3B8]"> · </span>
                    <span className={buy?"text-[#10B981]":"text-[#EF4444]"}>{e.sym} {e.side}</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] tabular">₺{Number(e.amount).toLocaleString("tr-TR")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
