// Coinberx — Canlı Destek Widget
// Hem giriş yapmış kullanıcılara hem ziyaretçilere açık.
// 4 saniyelik long-polling ile canlı hisi verir.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChatCircleDots, X, PaperPlaneTilt, Headset, ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const STORAGE_KEY = "coinberx_chat_visitor";

function loadVisitor() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}
function saveVisitor(obj) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch { /* ignore */ }
}

export default function SupportWidget() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visitorId, setVisitorId] = useState(loadVisitor().visitor_id || null);
  const [intro, setIntro] = useState({ name: loadVisitor().name || "", contact: loadVisitor().contact || "" });
  const [pendingIntro, setPendingIntro] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const panelRef = useRef(null);
  const listRef = useRef(null);
  const pollRef = useRef(null);
  const lastSyncRef = useRef(null);

  // Decide if we still need intro form (only for visitors that haven't introduced)
  const needsIntro = !user && !session && !intro.name;

  // Close on route change
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  // Auto-scroll on new message
  useEffect(() => { listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages.length, open]);

  // Background poll for unread badge (every 8s)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const v = loadVisitor();
      const sid = (session && session.session_id) || v.session_id;
      const vid = v.visitor_id;
      if (!sid) return;
      try {
        const params = new URLSearchParams({ session_id: sid });
        if (vid && !user) params.append("visitor_id", vid);
        const { data } = await api.get(`/live-chat/poll?${params.toString()}`);
        if (cancelled) return;
        const s = data.session || {};
        // Treat admin replies as unread when widget closed
        if (!open) setUnread(s.unread_user_count || 0);
      } catch { /* ignore */ }
    };
    const t = setInterval(tick, 8000);
    tick();
    return () => { cancelled = true; clearInterval(t); };
  }, [open, session, user]);

  // Active conversation polling when open
  useEffect(() => {
    if (!open || !session) return;
    const tick = async () => {
      try {
        const v = loadVisitor();
        const params = new URLSearchParams({ session_id: session.session_id });
        if (v.visitor_id && !user) params.append("visitor_id", v.visitor_id);
        if (lastSyncRef.current) params.append("since", lastSyncRef.current);
        const { data } = await api.get(`/live-chat/poll?${params.toString()}`);
        if (data?.messages?.length) {
          setMessages((prev) => {
            const have = new Set(prev.map((m) => m.message_id));
            const fresh = data.messages.filter((m) => !have.has(m.message_id));
            return [...prev, ...fresh];
          });
          lastSyncRef.current = data.messages[data.messages.length - 1].created_at;
        }
        if (data?.session) setSession(data.session);
        setUnread(0);
      } catch { /* ignore */ }
    };
    tick();
    pollRef.current = setInterval(tick, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  }, [open, session, user]);

  // Open widget -> resume any existing session (visitor reload safe)
  const ensureSession = async (introData = null) => {
    const v = loadVisitor();
    const payload = {
      visitor_id: v.visitor_id || undefined,
      name: introData?.name || intro.name || undefined,
      contact: introData?.contact || intro.contact || undefined,
      page_url: window.location.pathname + window.location.search,
    };
    const { data } = await api.post("/live-chat/start", payload);
    const sess = data.session;
    const vid = data.visitor_id;
    setSession(sess);
    setVisitorId(vid);
    saveVisitor({
      visitor_id: vid,
      session_id: sess.session_id,
      name: introData?.name || intro.name || v.name || sess.name,
      contact: introData?.contact || intro.contact || v.contact || sess.contact,
    });
    // load existing messages
    const params = new URLSearchParams({ session_id: sess.session_id });
    if (vid && !user) params.append("visitor_id", vid);
    const res = await api.get(`/live-chat/poll?${params.toString()}`);
    setMessages(res.data?.messages || []);
    if (res.data?.messages?.length) lastSyncRef.current = res.data.messages[res.data.messages.length - 1].created_at;
    return sess;
  };

  const openWidget = async () => {
    setOpen(true);
    if (!session) {
      if (user || intro.name) {
        try { await ensureSession(); } catch { /* ignore */ }
      }
    }
  };

  const handleIntro = async (e) => {
    e.preventDefault();
    if (!intro.name.trim()) return;
    setPendingIntro(true);
    try {
      await ensureSession({ name: intro.name.trim(), contact: intro.contact.trim() });
    } finally {
      setPendingIntro(false);
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      let sess = session;
      if (!sess) sess = await ensureSession();
      const v = loadVisitor();
      const { data } = await api.post("/live-chat/message", {
        session_id: sess.session_id,
        visitor_id: user ? undefined : v.visitor_id,
        body,
      });
      setMessages((prev) => [...prev, data.message]);
      lastSyncRef.current = data.message.created_at;
      setDraft("");
    } catch (err) {
      // surface error inline
      setMessages((prev) => [...prev, { message_id: `err_${Date.now()}`, sender: "system", body: "Mesaj gönderilemedi, tekrar deneyin.", created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const userMsgs = messages.filter((m) => m.sender !== "system");
  const hasAdmin = userMsgs.some((m) => m.sender === "admin");

  return (
    <>
      {!open && (
        <button
          onClick={openWidget}
          data-testid="support-widget-btn"
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 group"
          aria-label="Canlı Destek"
        >
          <span className="absolute inset-0 rounded-full bg-[#16A34A] animate-pulse-green opacity-60" />
          <span className="relative w-14 h-14 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center shadow-xl shadow-green-500/30 transition-all group-hover:scale-105">
            <ChatCircleDots size={26} weight="fill" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white" data-testid="support-widget-badge">{unread}</span>
            )}
          </span>
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          data-testid="support-widget-panel"
          className="fixed bottom-20 lg:bottom-6 right-2 lg:right-6 left-2 lg:left-auto z-50 w-auto lg:w-[380px] max-h-[calc(100vh-7rem)] flex flex-col"
        >
          <div className="card-surface overflow-hidden shadow-2xl flex flex-col h-full">
            {/* header */}
            <div className="bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Headset size={20} weight="fill" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Coinberx Canlı Destek</div>
                  <div className="text-[11px] opacity-90 truncate">Size nasıl yardımcı olabiliriz?</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/15 flex-shrink-0" data-testid="support-widget-close" aria-label="Kapat">
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* INTRO (visitor) */}
            {needsIntro && (
              <form onSubmit={handleIntro} className="p-4 space-y-3 bg-white" data-testid="support-widget-intro">
                <div className="text-sm text-[#0F172A]">Sohbeti başlatmak için kısaca tanışalım.</div>
                <input
                  type="text"
                  placeholder="Adınız veya takma adınız *"
                  required maxLength={60}
                  value={intro.name}
                  onChange={(e) => setIntro({ ...intro, name: e.target.value })}
                  className="input-field text-sm"
                  data-testid="support-widget-intro-name"
                />
                <input
                  type="text"
                  placeholder="E-posta veya telefon (opsiyonel)"
                  maxLength={80}
                  value={intro.contact}
                  onChange={(e) => setIntro({ ...intro, contact: e.target.value })}
                  className="input-field text-sm"
                  data-testid="support-widget-intro-contact"
                />
                <button type="submit" disabled={pendingIntro} className="btn-primary w-full py-2.5 rounded-lg text-sm" data-testid="support-widget-intro-submit">
                  {pendingIntro ? "Bağlanılıyor..." : "Sohbeti Başlat"}
                </button>
                <div className="text-[11px] text-[#64748B] text-center">
                  Verileriniz yalnızca destek amaçlı kullanılır.
                </div>
              </form>
            )}

            {/* CHAT */}
            {!needsIntro && (
              <>
                <div ref={listRef} className="flex-1 min-h-[200px] max-h-[420px] overflow-y-auto scrollbar-thin p-3 space-y-2 bg-[#F7F9FC]" data-testid="support-widget-messages">
                  {/* welcome */}
                  <div className="text-center text-[11px] text-[#64748B] py-1">
                    {user ? `${user.name?.split(" ")[0] || "Merhaba"}, destek ekibimizle iletişimdesiniz.` : `Merhaba ${session?.name || intro.name || ""}, mesajınızı yazabilirsiniz.`}
                  </div>
                  {userMsgs.length === 0 && (
                    <div className="text-center text-xs text-[#64748B] py-4">
                      Destek ekibimiz en kısa sürede yanıt verecek.<br/>
                      Mesajınız doğrudan ekibe iletilir.
                    </div>
                  )}
                  {userMsgs.map((m) => {
                    const mine = m.sender === "user";
                    return (
                      <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-[#16A34A] text-white rounded-br-sm" :
                          "bg-white border border-[#E2E8F0] text-[#0F172A] rounded-bl-sm"
                        }`}>
                          {!mine && <div className="text-[10px] text-[#16A34A] font-semibold mb-0.5">Coinberx Destek</div>}
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-[#94A3B8]"}`}>
                            {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!hasAdmin && userMsgs.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-[#64748B]">
                        <div className="text-[10px] text-[#16A34A] font-semibold mb-0.5">Coinberx Destek</div>
                        Destek ekibimiz en kısa sürede yanıt verecek.
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={send} className="border-t border-[#E2E8F0] p-3 bg-white flex-shrink-0" data-testid="support-widget-form">
                  <div className="flex items-end gap-2">
                    <textarea
                      placeholder="Mesajınızı yazın..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1}
                      className="input-field text-sm flex-1 resize-none max-h-24"
                      data-testid="support-widget-input"
                    />
                    <button type="submit" disabled={sending || !draft.trim()} className="btn-primary px-3 py-2.5 rounded-lg flex items-center justify-center disabled:opacity-50" data-testid="support-widget-send" aria-label="Gönder">
                      <PaperPlaneTilt size={16} weight="fill" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] text-[#64748B]">destek@coinberx.com · 0850 000 00 00</div>
                    {user && (
                      <button type="button" onClick={() => { setOpen(false); nav("/support"); }} className="text-[11px] text-[#16A34A] hover:underline flex items-center gap-1" data-testid="support-widget-fullpage">
                        Tam sayfa <ArrowSquareOut size={10} weight="bold" />
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
