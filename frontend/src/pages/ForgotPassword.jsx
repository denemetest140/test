import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

export default function ForgotPassword() {
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!settings.forgot_password_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] text-[#0F172A] p-6">
        <div className="card-surface p-8 max-w-md text-center">
          <h1 className="font-display text-2xl">Şifre sıfırlama devre dışı</h1>
          <p className="text-sm text-[#64748B] mt-2">Yönetici şifre sıfırlamayı kapatmış. Lütfen destek ile iletişime geçin.</p>
          <Link to="/login" className="btn-primary inline-block px-5 py-2 rounded-lg text-sm mt-5">Giriş Sayfasına Dön</Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/password/forgot", { email });
      setSent(true);
      toast.success("E-posta gönderildi");
    } catch (err) {
      toast.error(errToStr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F7F9FC] text-[#0F172A]">
      <div className="hidden lg:flex items-center justify-center border-r border-[#E2E8F0] p-12">
        <div>
          <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-white font-bold text-xl flex items-center justify-center">C</div>
          <h2 className="font-display text-3xl mt-6">Şifrenizi mi unuttunuz?</h2>
          <p className="text-[#64748B] mt-3 max-w-md">E-posta adresinize 30 dakika geçerli güvenli bir sıfırlama bağlantısı göndereceğiz.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="forgot-form">
          <h1 className="font-display text-2xl mb-2">Şifremi Sıfırla</h1>
          {sent ? (
            <p data-testid="forgot-sent" className="text-sm text-[#16A34A] bg-[#16A34A]/10 rounded-lg p-4 mt-4">
              Eğer hesap mevcutsa, sıfırlama bağlantısı e-postanıza gönderildi. Lütfen gelen kutunuzu kontrol edin.
            </p>
          ) : (
            <>
              <p className="text-[#64748B] text-sm mb-6">E-posta adresinizi girin; size sıfırlama bağlantısı gönderelim.</p>
              <label className="text-xs text-[#64748B]">E-posta</label>
              <input data-testid="forgot-email" required type="email" className="input-field mt-1 mb-6" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="forgot-submit">
                {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
              </button>
            </>
          )}
          <div className="text-xs text-[#64748B] mt-5 text-center">
            <Link to="/login" className="text-[#16A34A]" data-testid="forgot-back-login">Giriş sayfasına dön</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
