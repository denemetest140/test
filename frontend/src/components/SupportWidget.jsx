import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChatCircleDots, X, PaperPlaneTilt, Headset } from "@phosphor-icons/react";
import { api, errToStr } from "../lib/api";
import { toast } from "sonner";

const CATS = [
  { v: "general", l: "Genel" },
  { v: "deposit", l: "Para Yatırma" },
  { v: "withdraw", l: "Para Çekme" },
  { v: "kyc", l: "KYC" },
  { v: "trading", l: "Trading" },
  { v: "security", l: "Güvenlik" },
];

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("new"); // 'new' | 'list'
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ subject: "", body: "", category: "general" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const panelRef = useRef(null);

  const refresh = () => {
    api.get("/support/messages").then((r) => setMessages(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  // close on route change
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    setLoading(true);
    try {
      await api.post("/support/message", form);
      toast.success("Mesajınız alındı, en kısa sürede döneceğiz.");
      setForm({ subject: "", body: "", category: "general" });
      setTab("list");
      refresh();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  const unread = messages.filter((m) => m.status === "answered").length;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="support-widget-btn"
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 group"
          aria-label="Canlı Destek"
        >
          <span className="absolute inset-0 rounded-full bg-[#16A34A] animate-pulse-green opacity-70" />
          <span className="relative w-14 h-14 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center shadow-xl shadow-green-500/30 transition-all group-hover:scale-105">
            <ChatCircleDots size={26} weight="fill" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">{unread}</span>
            )}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px]" ref={panelRef} data-testid="support-widget-panel">
          <div className="card-surface overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Headset size={18} weight="fill" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Canlı Destek</div>
                  <div className="text-[11px] opacity-90">7/24 Türkçe yardım hattı</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/15" data-testid="support-widget-close">
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="flex border-b border-[#E2E8F0]">
              <button onClick={() => setTab("new")} className={`flex-1 py-2.5 text-sm font-medium ${tab==="new"?"text-[#16A34A] border-b-2 border-[#16A34A]":"text-[#64748B]"}`} data-testid="support-widget-tab-new">Yeni Mesaj</button>
              <button onClick={() => setTab("list")} className={`flex-1 py-2.5 text-sm font-medium ${tab==="list"?"text-[#16A34A] border-b-2 border-[#16A34A]":"text-[#64748B]"}`} data-testid="support-widget-tab-list">
                Mesajlarım {messages.length > 0 && <span className="ml-1 text-[10px] tabular text-[#64748B]">({messages.length})</span>}
              </button>
            </div>

            {tab === "new" && (
              <form onSubmit={submit} className="p-4 space-y-3 bg-white" data-testid="support-widget-form">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field text-sm"
                  data-testid="support-widget-category"
                >
                  {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
                <input
                  placeholder="Konu"
                  required maxLength={120}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input-field text-sm"
                  data-testid="support-widget-subject"
                />
                <textarea
                  placeholder="Mesajınızı yazın..."
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="input-field text-sm min-h-[100px]"
                  data-testid="support-widget-body"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2" data-testid="support-widget-submit">
                    <PaperPlaneTilt size={14} weight="fill" /> {loading ? "Gönderiliyor..." : "Gönder"}
                  </button>
                  <button type="button" onClick={() => { setOpen(false); nav("/support"); }} className="px-3 py-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-sm text-[#475569]" data-testid="support-widget-fullpage">Tam Sayfa</button>
                </div>
                <div className="text-[11px] text-[#64748B] flex items-center justify-between pt-1">
                  <span>📞 0850 000 00 00</span>
                  <span>destek@coinberx.com</span>
                </div>
              </form>
            )}

            {tab === "list" && (
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin bg-white p-3 space-y-2" data-testid="support-widget-list">
                {messages.length === 0 ? (
                  <div className="text-sm text-[#64748B] py-10 text-center">Henüz mesajınız yok</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.message_id} className="border border-[#E2E8F0] rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-[#0F172A]">{m.subject}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status==="open"?"bg-amber-50 text-amber-700":m.status==="answered"?"bg-blue-50 text-blue-700":"bg-green-50 text-[#16A34A]"}`}>
                          {m.status === "open" ? "Açık" : m.status === "answered" ? "Yanıtlandı" : "Kapalı"}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B] mt-1">{new Date(m.created_at).toLocaleString("tr-TR")}</div>
                      <div className="text-xs text-[#475569] mt-2 line-clamp-2">{m.body}</div>
                      {(m.replies || []).slice(-1).map((r, i) => (
                        <div key={i} className="mt-2 pt-2 border-t border-[#E2E8F0]">
                          <div className="text-[10px] text-[#16A34A] uppercase">Coinberx Destek</div>
                          <div className="text-xs text-[#0F172A] mt-0.5 line-clamp-3">{r.body}</div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
