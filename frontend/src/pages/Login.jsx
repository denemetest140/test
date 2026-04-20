import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { GoogleLogo } from "@phosphor-icons/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data.user);
      toast.success("Hoş geldiniz, " + data.user.name);
      nav("/dashboard");
    } catch (err) {
      toast.error(errToStr(err));
    } finally {
      setLoading(false);
    }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirect = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#070A0F] text-[#F8FAFC]">
      <div className="hidden lg:flex relative items-center justify-center bg-[#0B0E14] border-r border-[#1F2633] overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative z-10 max-w-md p-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#DCA335] text-black font-bold text-xl flex items-center justify-center">C</div>
            <span className="font-display text-2xl">Coinberx</span>
          </div>
          <h2 className="font-display text-3xl tracking-tight">Türkiye'nin premium kripto borsasına hoş geldiniz.</h2>
          <p className="text-[#94A3B8] mt-4">IBAN ile TL yatırın, saniyeler içinde kripto alın. Güvenli, hızlı, yerel.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="login-form">
          <h1 className="font-display text-2xl mb-2">Giriş Yap</h1>
          <p className="text-[#94A3B8] text-sm mb-6">Hesabınızla devam edin</p>

          <button type="button" onClick={google} data-testid="login-google-btn" className="w-full mb-5 flex items-center justify-center gap-2 py-3 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm">
            <GoogleLogo size={18} weight="bold" /> Google ile Devam Et
          </button>
          <div className="flex items-center gap-3 my-5 text-xs text-[#94A3B8]">
            <div className="flex-1 h-px bg-[#1F2633]" /> veya <div className="flex-1 h-px bg-[#1F2633]" />
          </div>

          <label className="text-xs text-[#94A3B8]">E-posta</label>
          <input data-testid="login-email" className="input-field mt-1 mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="text-xs text-[#94A3B8]">Şifre</label>
          <input data-testid="login-password" className="input-field mt-1 mb-6" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="login-submit">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          <div className="text-xs text-[#94A3B8] mt-5 text-center">
            Hesabınız yok mu? <Link to="/register" className="text-[#DCA335]" data-testid="login-to-register">Kayıt olun</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
