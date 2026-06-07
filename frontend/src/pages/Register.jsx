import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setUser(data.user);
      toast.success("Hesap oluşturuldu. E-posta doğrulama kodunuz gönderildi.");
      nav("/verify-email", { state: { email: form.email } });
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
          <h2 className="font-display text-3xl tracking-tight">3 dakikada hesap aç, TL ile kripto almaya başla.</h2>
          <ul className="text-[#64748B] text-sm mt-6 space-y-2">
            <li>✓ %0.1 düşük komisyon</li>
            <li>✓ IBAN ile anında yatırım</li>
            <li>✓ 7/24 Türkçe destek</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="register-form">
          <h1 className="font-display text-2xl mb-2">Hesap Oluştur</h1>
          <p className="text-[#64748B] text-sm mb-6">E-posta ile ücretsiz kayıt</p>

          <label className="text-xs text-[#64748B]">Ad Soyad</label>
          <input data-testid="register-name" className="input-field mt-1 mb-4" type="text" required value={form.name} onChange={set("name")} />
          <label className="text-xs text-[#64748B]">E-posta</label>
          <input data-testid="register-email" className="input-field mt-1 mb-4" type="email" required value={form.email} onChange={set("email")} />
          <label className="text-xs text-[#64748B]">Şifre (min 8)</label>
          <input data-testid="register-password" className="input-field mt-1 mb-6" type="password" required minLength={8} value={form.password} onChange={set("password")} />

          <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="register-submit">
            {loading ? "Oluşturuluyor..." : "Hesabımı Oluştur"}
          </button>
          <div className="text-xs text-[#64748B] mt-5 text-center">
            Hesabınız var mı? <Link to="/login" className="text-[#16A34A]" data-testid="register-to-login">Giriş yapın</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
