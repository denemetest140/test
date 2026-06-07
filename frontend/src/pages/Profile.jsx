import { useEffect, useState } from "react";
import { api, errToStr } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [history, setHistory] = useState([]);

  useEffect(() => { api.get("/user/login-history").then((r) => setHistory(r.data || [])).catch(() => {}); }, []);

  const save = async (e) => {
    e.preventDefault();
    try { await api.patch("/user/profile", { name, phone }); await refresh(); toast.success("Profil güncellendi"); }
    catch (err) { toast.error(errToStr(err)); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-6">Profil ve Güvenlik</h1>

      <form onSubmit={save} className="card-surface p-6 mb-6">
        <div className="text-xs text-[#64748B] mb-4">Hesap Bilgileri</div>
        <label className="text-xs text-[#64748B]">Ad Soyad</label>
        <input data-testid="profile-name" className="input-field mt-1 mb-3" value={name} onChange={(e)=>setName(e.target.value)} />
        <label className="text-xs text-[#64748B]">E-posta</label>
        <input className="input-field mt-1 mb-3" value={user?.email || ""} disabled />
        <label className="text-xs text-[#64748B]">Telefon</label>
        <input data-testid="profile-phone" className="input-field mt-1 mb-4" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        <button className="btn-primary px-5 py-2 rounded-lg text-sm" data-testid="profile-save">Kaydet</button>
      </form>

      <div className="card-surface p-6 mb-6">
        <div className="text-xs text-[#64748B] mb-3">Hesap Özeti</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-[#64748B]">Kayıt</div><div className="tabular">{user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR") : "-"}</div></div>
          <div><div className="text-xs text-[#64748B]">Giriş Yöntemi</div><div>{user?.auth_provider === "google" ? "Google" : "E-posta"}</div></div>
          <div><div className="text-xs text-[#64748B]">E-posta Doğrulama</div><div className={user?.email_verified?"text-[#16A34A]":"text-[#D97706]"}>{user?.email_verified?"Doğrulandı":"Beklemede"}</div></div>
          <div><div className="text-xs text-[#64748B]">Referans Kodum</div><div className="tabular text-[#16A34A]">{user?.referral_code}</div></div>
        </div>
      </div>

      <div className="card-surface p-6">
        <div className="text-xs text-[#64748B] mb-3">Son Girişler</div>
        {history.length === 0 ? <div className="text-sm text-[#64748B]">Kayıt yok</div> : (
          <div className="divide-y divide-[#E2E8F0]">
            {history.map((h, i) => (
              <div key={i} className="py-2 flex items-center justify-between text-xs">
                <span className="tabular">{new Date(h.at).toLocaleString("tr-TR")}</span>
                <span className="text-[#64748B]">{h.ip}</span>
                <span className="text-[#64748B] truncate max-w-[200px]">{h.user_agent?.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
