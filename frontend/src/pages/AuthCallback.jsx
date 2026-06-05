import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    window.history.replaceState({}, "", "/login");
    nav("/login", { replace: true });
  }, [nav]);
  return null;
}
