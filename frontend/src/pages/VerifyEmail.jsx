import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api, errToStr } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function VerifyEmail() {
  const { refresh } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [email, setEmail] = useState(loc.state?.email || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-email", { email, code });
      await refresh();
      toast.success("E-posta doğrulandı");
      nav("/dashboard");
    } catch (err) {
      toast.error(errToStr(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post("/auth/resend-code", { email });
      toast.success("Yeni kod gönderildi");
    } catch (err) {
      toast.error(errToStr(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A0F] text-[#F8FAFC] p-6">
      <form onSubmit={submit} className="w-full max-w-md card-surface p-8" data-testid="verify-form">
        <h1 className="font-display text-2xl mb-2">E-posta Doğrulama</h1>
        <p className="text-[#94A3B8] text-sm mb-6">E-postanıza gönderilen 6 haneli kodu girin</p>
        <label className="text-xs text-[#94A3B8]">E-posta</label>
        <input data-testid="verify-email-input" className="input-field mt-1 mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-xs text-[#94A3B8]">Kod</label>
        <input data-testid="verify-code-input" className="input-field mt-1 mb-6 tabular text-center text-xl tracking-[0.4em]" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <button disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="verify-submit">
          {loading ? "Doğrulanıyor..." : "Doğrula"}
        </button>
        <button type="button" onClick={resend} className="w-full mt-3 text-xs text-[#DCA335] hover:underline" data-testid="verify-resend">
          Kodu tekrar gönder
        </button>
        <div className="text-xs text-[#94A3B8] mt-5 text-center">
          <Link to="/dashboard" className="hover:text-white">Şimdilik atla</Link>
        </div>
      </form>
    </div>
  );
}
