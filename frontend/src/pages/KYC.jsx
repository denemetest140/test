import { useEffect, useState } from "react";
import { api, errToStr } from "../lib/api";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";

export default function KYC() {
  const [status, setStatus] = useState("none");
  const [req, setReq] = useState(null);
  const [form, setForm] = useState({ full_name: "", id_number: "", birth_date: "" });
  const [files, setFiles] = useState({ id_front: null, id_back: null, selfie: null });
  const [loading, setLoading] = useState(false);

  const load = () => { api.get("/kyc/status").then((r) => { setStatus(r.data.status); setReq(r.data.request); }).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!files.id_front || !files.id_back || !files.selfie) { toast.error("Tüm belgeleri yükleyin"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Object.entries(files).forEach(([k, v]) => fd.append(k, v));
    setLoading(true);
    try { await api.post("/kyc/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("KYC başvurunuz alındı"); load(); }
    catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  if (status === "approved") return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto anim-fade-up">
      <div className="card-surface p-8 text-center">
        <CheckCircle size={60} className="text-[#16A34A] mx-auto" weight="fill" />
        <h1 className="font-display text-2xl mt-4">KYC Onaylandı</h1>
        <p className="text-[#64748B] text-sm mt-2">Tüm özellikleri kullanabilirsiniz</p>
      </div>
    </div>
  );
  if (status === "pending") return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto anim-fade-up">
      <div className="card-surface p-8 text-center">
        <Clock size={60} className="text-[#D97706] mx-auto" weight="fill" />
        <h1 className="font-display text-2xl mt-4">İnceleme Sürüyor</h1>
        <p className="text-[#64748B] text-sm mt-2">Başvurunuz yönetici onayı bekliyor. 24 saat içinde sonuçlanır.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-2">Kimlik Doğrulama (KYC)</h1>
      <p className="text-[#64748B] text-sm mb-6">Para çekme ve işlem limitlerini açmak için kimlik belgenizi yükleyin.</p>

      {status === "rejected" && req?.review_note && (
        <div className="card-surface p-4 mb-4 border-l-4 border-[#DC2626]">
          <div className="flex gap-2 items-start"><XCircle size={18} className="text-[#DC2626] mt-0.5" weight="fill" /><div><div className="text-sm font-medium">Reddedildi</div><div className="text-xs text-[#64748B] mt-1">{req.review_note}</div></div></div>
        </div>
      )}

      <form onSubmit={submit} className="card-surface p-6 space-y-4" data-testid="kyc-form">
        <div>
          <label className="text-xs text-[#64748B]">Ad Soyad (Kimlikteki gibi)</label>
          <input data-testid="kyc-name" className="input-field mt-1" required value={form.full_name} onChange={(e)=>setForm({...form, full_name: e.target.value})} />
        </div>
        <div>
          <label className="text-xs text-[#64748B]">TC Kimlik No</label>
          <input data-testid="kyc-id" className="input-field mt-1 tabular" required pattern="\d{11}" maxLength={11} value={form.id_number} onChange={(e)=>setForm({...form, id_number: e.target.value.replace(/\D/g,"")})} />
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Doğum Tarihi</label>
          <input data-testid="kyc-birth" type="date" className="input-field mt-1" required value={form.birth_date} onChange={(e)=>setForm({...form, birth_date: e.target.value})} />
        </div>
        {[
          ["id_front", "Kimlik Ön Yüz"],
          ["id_back", "Kimlik Arka Yüz"],
          ["selfie", "Kimliği Tutarken Selfie"],
        ].map(([k, l]) => (
          <label key={k} className="flex items-center gap-3 cursor-pointer bg-[#FFFFFF] border border-dashed border-[#E2E8F0] hover:border-[#16A34A] rounded-lg px-4 py-4" data-testid={`kyc-upload-${k}`}>
            <Upload size={18} className="text-[#16A34A]" />
            <div className="flex-1">
              <div className="text-sm font-medium">{l}</div>
              <div className="text-xs text-[#64748B]">{files[k]?.name || "JPG / PNG - Max 8MB"}</div>
            </div>
            <input type="file" accept="image/*" className="hidden" required onChange={(e)=>setFiles({...files, [k]: e.target.files?.[0]})} />
          </label>
        ))}
        <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="kyc-submit">{loading?"Yükleniyor...":"Başvuruyu Gönder"}</button>
      </form>
    </div>
  );
}
