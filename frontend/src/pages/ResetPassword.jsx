import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Şifre en az 8 karakter olmalı"); return; }
    if (password !== confirm) { toast.error("Şifreler eşleşmiyor"); return; }
    setLoading(true);
    try {
      await api.post("/auth/password/reset", { token, new_password: password });
      setDone(true);
      toast.success("Şifreniz güncellendi");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      toast.error(errToStr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] text-[#0F172A] p-6">
      <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="reset-form">
        <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-white font-bold text-xl flex items-center justify-center mb-4">C</div>
        <h1 className="font-display text-2xl mb-2">Yeni Şifre Belirle</h1>
        {!token && (
          <p className="text-sm text-[#DC2626] bg-[#DC2626]/10 rounded-lg p-3 mt-3">Geçersiz bağlantı. Lütfen e-postadaki bağlantıyı tıklayın.</p>
        )}
        {done ? (
          <p data-testid="reset-done" className="text-sm text-[#16A34A] bg-[#16A34A]/10 rounded-lg p-3 mt-3">Şifreniz başarıyla güncellendi. Yönlendiriliyorsunuz...</p>
        ) : (
          <>
            <p className="text-[#64748B] text-sm mb-6">En az 8 karakter olmalı.</p>
            <label className="text-xs text-[#64748B]">Yeni şifre</label>
            <input data-testid="reset-password" type="password" required minLength={8} className="input-field mt-1 mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="text-xs text-[#64748B]">Yeni şifre (tekrar)</label>
            <input data-testid="reset-confirm" type="password" required minLength={8} className="input-field mt-1 mb-6" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button disabled={loading || !token} className="btn-primary w-full py-3 rounded-lg" data-testid="reset-submit">
              {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </>
        )}
        <div className="text-xs text-[#64748B] mt-5 text-center">
          <Link to="/login" className="text-[#16A34A]">Giriş Sayfası</Link>
        </div>
      </form>
    </div>
  );
}
