import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

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
          <div className="flex justify-between text-xs text-[#64748B] mt-3">
            <Link to="/forgot-password" className="text-[#16A34A]" data-testid="login-forgot">Şifremi unuttum</Link>
            <Link to="/register" className="text-[#16A34A]" data-testid="login-to-register">Kayıt ol</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
