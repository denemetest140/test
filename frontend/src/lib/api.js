import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const formatTRY = (v, digits = 2) => {
  if (v === null || v === undefined || isNaN(v)) return "₺0,00";
  return "₺" + Number(v).toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const formatNumber = (v, digits = 8) => {
  if (v === null || v === undefined || isNaN(v)) return "0";
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: digits });
};

export const formatPct = (v) => {
  if (v === null || v === undefined || isNaN(v)) return "0,00%";
  const sign = v > 0 ? "+" : "";
  return sign + Number(v).toFixed(2).replace(".", ",") + "%";
};

export const errToStr = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Bir hata oluştu";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return String(d);
};
