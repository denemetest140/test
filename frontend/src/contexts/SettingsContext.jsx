import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const SettingsContext = createContext(null);

const DEFAULTS = {
  site_name: "Coinberx",
  site_slogan: "Türkiye'nin premium kripto borsası",
  logo_url: "",
  favicon_url: "",
  contact_email: "destek@coinberx.com",
  contact_phone: "",
  social_twitter: "",
  social_telegram: "",
  social_instagram: "",
  social_youtube: "",
  maintenance_mode: false,
  live_chat_enabled: true,
  theme_primary: "#16A34A",
  theme_secondary: "#15803D",
  theme_accent: "#D4A017",
  theme_berx: "#D4A017",
  theme_background: "#F7F9FC",
  theme_card: "#FFFFFF",
  theme_text: "#0F172A",
  theme_button_radius: "0.5rem",
  theme_card_radius: "0.75rem",
  seo_title: "Coinberx | Güvenli ve Hızlı Kripto Para Borsası",
  seo_description: "Coinberx ile güvenli, hızlı ve modern kripto para alım satım deneyimi.",
  og_image: "",
  twitter_image: "",
  pwa_theme_color: "#16A34A",
  pwa_background_color: "#F7F9FC",
  kyc_enabled: true,
  email_verification_enabled: true,
  google_login_enabled: false,
  forgot_password_enabled: true,
  registration_enabled: true,
  footer_text: "© Coinberx · MASAK uyumlu",
};

function applyTheme(s) {
  const r = document.documentElement.style;
  if (s.theme_primary) r.setProperty("--cb-primary", s.theme_primary);
  if (s.theme_secondary) r.setProperty("--cb-secondary", s.theme_secondary);
  if (s.theme_accent) r.setProperty("--cb-accent", s.theme_accent);
  if (s.theme_berx) r.setProperty("--cb-berx", s.theme_berx);
  if (s.theme_background) r.setProperty("--cb-bg", s.theme_background);
  if (s.theme_card) r.setProperty("--cb-card", s.theme_card);
  if (s.theme_text) r.setProperty("--cb-text", s.theme_text);
  if (s.theme_button_radius) r.setProperty("--cb-button-radius", s.theme_button_radius);
  if (s.theme_card_radius) r.setProperty("--cb-card-radius", s.theme_card_radius);
}

function applyMeta(s) {
  if (s.seo_title) document.title = s.seo_title;
  const ensure = (selector, attrs) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    }
    return el;
  };
  const set = (selector, attrs, content) => {
    const el = ensure(selector, attrs);
    if (content !== undefined && content !== null) el.setAttribute("content", content);
  };
  set('meta[name="description"]', { name: "description" }, s.seo_description);
  set('meta[name="keywords"]', { name: "keywords" }, s.seo_keywords);
  set('meta[property="og:title"]', { property: "og:title" }, s.seo_title);
  set('meta[property="og:description"]', { property: "og:description" }, s.seo_description);
  if (s.og_image) set('meta[property="og:image"]', { property: "og:image" }, s.og_image);
  set('meta[name="twitter:title"]', { name: "twitter:title" }, s.seo_title);
  set('meta[name="twitter:description"]', { name: "twitter:description" }, s.seo_description);
  if (s.twitter_image) set('meta[name="twitter:image"]', { name: "twitter:image" }, s.twitter_image);
  set('meta[name="theme-color"]', { name: "theme-color" }, s.pwa_theme_color);
  if (s.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = s.favicon_url;
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const fetchBranding = useCallback(async () => {
    try {
      const { data } = await api.get("/branding");
      const merged = { ...DEFAULTS, ...data };
      setSettings(merged);
      applyTheme(merged);
      applyMeta(merged);
    } catch {
      applyTheme(DEFAULTS);
      applyMeta(DEFAULTS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const applyPageSeo = useCallback(async (slug) => {
    try {
      const { data } = await api.get(`/seo/pages/${slug}`);
      if (data?.title) document.title = data.title;
      if (data?.description) {
        let el = document.querySelector('meta[name="description"]');
        if (el) el.setAttribute("content", data.description);
      }
      if (data?.image) {
        let el = document.querySelector('meta[property="og:image"]');
        if (el) el.setAttribute("content", data.image);
      }
    } catch {
      // fall back to global seo_title (no-op)
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh: fetchBranding, applyPageSeo }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext) || { settings: DEFAULTS, loaded: true, refresh: () => {}, applyPageSeo: () => {} };
