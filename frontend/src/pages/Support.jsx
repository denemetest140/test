import { useEffect, useState } from "react";
import { api, errToStr } from "../lib/api";
import { toast } from "sonner";
import { ChatCircleText, PaperPlaneTilt, Headset, Lifebuoy } from "@phosphor-icons/react";

const CATS = [
  { v: "general", l: "Genel" },
  { v: "deposit", l: "Para Yatırma" },
  { v: "withdraw", l: "Para Çekme" },
  { v: "kyc", l: "KYC" },
  { v: "trading", l: "Trading" },
  { v: "security", l: "Güvenlik" },
];

export default function Support() {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ subject: "", body: "", category: "general" });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => api.get("/support/messages").then((r) => setMessages(r.data || [])).catch(() => {});
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.body) return;
    setLoading(true);
    try {
      await api.post("/support/message", form);
      toast.success("Mesajınız alındı, en kısa sürede döneceğiz.");
      setForm({ subject: "", body: "", category: "general" });
      load();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  const statusChip = (s) => ({
    open: "text-[#F59E0B] bg-[#F59E0B]/10",
    answered: "text-[#3B82F6] bg-[#3B82F6]/10",
    closed: "text-[#10B981] bg-[#10B981]/10",
  }[s] || "text-[#94A3B8] bg-[#1F2633]");
  const statusLabel = (s) => ({ open: "Açık", answered: "Yanıtlandı", closed: "Kapalı" }[s] || s);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto anim-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl">Destek & İletişim</h1>
          <p className="text-[#94A3B8] text-sm mt-1">7/24 Türkçe destek ekibimiz yardımcı olmaya hazır. Ortalama yanıt süresi 30 dk.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="chip"><Headset size={14} className="text-[#DCA335]" weight="fill"/>destek@coinberx.com</div>
          <div className="chip"><Lifebuoy size={14} className="text-[#DCA335]" weight="fill"/>0850 000 00 00</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="card-surface p-6" data-testid="support-form">
          <div className="flex items-center gap-2 mb-4">
            <ChatCircleText size={18} className="text-[#DCA335]" weight="fill"/>
            <div className="font-display text-lg">Yeni Mesaj</div>
          </div>
          <label className="text-xs text-[#94A3B8]">Konu Kategorisi</label>
          <select
            data-testid="support-category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input-field mt-1 mb-4"
          >
            {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <label className="text-xs text-[#94A3B8]">Başlık</label>
          <input data-testid="support-subject" className="input-field mt-1 mb-4" maxLength={120} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <label className="text-xs text-[#94A3B8]">Mesajınız</label>
          <textarea data-testid="support-body" className="input-field mt-1 mb-4 min-h-[140px]" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <button disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm" data-testid="support-submit">
            <PaperPlaneTilt size={14} weight="fill"/> {loading ? "Gönderiliyor..." : "Mesaj Gönder"}
          </button>
        </form>

        <div className="card-surface p-6">
          <div className="font-display text-lg mb-4">Mesajlarım</div>
          {messages.length === 0 ? (
            <div className="text-sm text-[#94A3B8] py-6 text-center">Henüz mesajınız yok</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.message_id}
                  className="bg-[#0B0E14] border border-[#1F2633] rounded-lg p-4 cursor-pointer hover:border-[#DCA335]/50"
                  onClick={() => setSelected(selected?.message_id === m.message_id ? null : m)}
                  data-testid={`support-msg-${m.message_id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.subject}</div>
                      <div className="text-xs text-[#94A3B8] mt-1">{new Date(m.created_at).toLocaleString("tr-TR")}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusChip(m.status)}`}>{statusLabel(m.status)}</span>
                  </div>
                  {selected?.message_id === m.message_id && (
                    <div className="mt-3 pt-3 border-t border-[#1F2633] space-y-3">
                      <div>
                        <div className="text-[10px] text-[#94A3B8] uppercase">Sizin mesajınız</div>
                        <div className="text-sm mt-1 whitespace-pre-wrap">{m.body}</div>
                      </div>
                      {(m.replies || []).map((r, i) => (
                        <div key={i} className="bg-[#DCA335]/5 border border-[#DCA335]/30 rounded p-3">
                          <div className="text-[10px] text-[#DCA335] uppercase">Coinberx Destek · {new Date(r.at).toLocaleString("tr-TR")}</div>
                          <div className="text-sm mt-1 whitespace-pre-wrap">{r.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl mb-4">Sıkça Sorulan Sorular</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["TL yatırma ne kadar sürer?", "Havale/EFT mesai saatlerinde 5-15 dk, hafta sonu 1 saati bulabilir. Dekont yükledikten sonra otomatik admin kuyruğuna düşer."],
            ["Neden KYC gerekli?", "Türkiye MASAK mevzuatı gereği kripto platformları kimlik doğrulaması yapmak zorundadır."],
            ["Komisyon oranı nedir?", "Tüm spot işlemler için %0,1 sabit komisyon uygulanır."],
            ["Minimum çekim limiti?", "Varsayılan 100 TL (admin panelinden değiştirilebilir)."],
          ].map(([q, a]) => (
            <div key={q} className="card-surface p-5">
              <div className="text-sm font-medium text-[#DCA335]">{q}</div>
              <div className="text-sm text-[#94A3B8] mt-2">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
