import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sid = params.get("session_id");
    if (!sid) { nav("/login"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", null, {
          headers: { "X-Session-ID": sid },
        });
        setUser(data.user);
        window.history.replaceState({}, "", "/dashboard");
        nav("/dashboard", { replace: true });
      } catch (e) {
        toast.error("Google girişi başarısız");
        nav("/login");
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A0F] text-[#94A3B8]">
      <div className="animate-pulse">Google oturumu kuruluyor...</div>
    </div>
  );
}
