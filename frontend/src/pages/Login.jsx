import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState({ available: false });
  const { setUser } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/auth/google/status").then((r) => setGoogleStatus(r.data)).catch(() => {});
  }, []);

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

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F7F9FC] text-[#0F172A]">
      <div className="hidden lg:flex relative items-center justify-center bg-[#FFFFFF] border-r border-[#E2E8F0] overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative z-10 max-w-md p-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-black font-bold text-xl flex items-center justify-center">C</div>
            <span className="font-display text-2xl">Coinberx</span>
          </div>
          <h2 className="font-display text-3xl tracking-tight">Türkiye'nin premium kripto borsasına hoş geldiniz.</h2>
          <p className="text-[#64748B] mt-4">IBAN ile TL yatırın, saniyeler içinde kripto alın. Güvenli, hızlı, yerel.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="login-form">
          <h1 className="font-display text-2xl mb-2">Giriş Yap</h1>
          <p className="text-[#64748B] text-sm mb-6">Hesabınızla devam edin</p>

          <label className="text-xs text-[#64748B]">E-posta</label>
          <input data-testid="login-email" className="input-field mt-1 mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="text-xs text-[#64748B]">Şifre</label>
          <input data-testid="login-password" className="input-field mt-1 mb-6" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="login-submit">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          {googleStatus.available && (
            <a
              href={`https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleStatus.client_id)}&redirect_uri=${encodeURIComponent(googleStatus.redirect_uri)}&response_type=code&scope=openid%20email%20profile&access_type=offline`}
              className="mt-3 w-full py-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-sm flex items-center justify-center gap-2 text-[#0F172A]"
              data-testid="login-google"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.73.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Google ile Giriş Yap
            </a>
          )}
          <div className="flex justify-between text-xs text-[#64748B] mt-3">
            <Link to="/forgot-password" className="text-[#16A34A]" data-testid="login-forgot">Şifremi unuttum</Link>
            <Link to="/register" className="text-[#16A34A]" data-testid="login-to-register">Kayıt ol</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
