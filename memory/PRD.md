# Coinberx — Turkish Crypto Exchange (PRD)

## Vision
Coinberx, Türk yatırımcılar için açık tema, kurumsal, premium görünümlü, mobil uygulamaya çevrilebilir mimaride bir kripto borsasıdır. Sahte veri yok, gerçek borsa akışları çalışır.

## Architecture
- Backend: FastAPI + Motor (MongoDB). Dosyalar: `server.py` (~2830 LOC), `market_data.py`, `storage.py`, `email_service.py`, `berx.py`, `networks.py`.
- Frontend: React 19 + Tailwind + Shadcn + lightweight-charts + Phosphor + sonner. AuthContext + SettingsContext (yeni).
- Database collections: users, wallets, orders, transactions, cost_basis, deposits, withdrawals, kyc_requests, crypto_withdrawals, crypto_deposits, platform_addresses, coin_networks, networks, internal_transfers, admin_activity_logs, support_messages, live_chat_sessions, live_chat_messages, berx_settings, berx_ticks, system_settings, password_resets, price_overrides, price_snapshots, seo_pages, **media_uploads**.
- Background loops: BERX simulation (10s), **limit matching engine (6s)**.

## Implemented features (cumulative)

### Auth & Users
- E-posta+şifre JWT, brute-force koruması, e-posta doğrulama (kod), şifremi unuttum (token + 30 dk).
- KYC pending/approved/rejected akışı (admin onaylı).
- Admin: kullanıcı CRUD — view, edit (name/email/phone/role/kyc/account_status/email_verified), soft delete (banned + email anonimize), include_deleted listesi.
- Soft-deleted / banned kullanıcı login bloğu.
- Google OAuth: admin panelden client_id / client_secret / redirect_uri ayarı; `/auth/google/status` available/configured/enabled bilgisi; Login ekranında Google butonu sadece `available=true` ise görünür.

### Trading
- Spot al-sat: market buy/sell instant fill (Binance fiyatından).
- **Limit emir motoru (yeni)**: 6 saniye'de bir background loop tüm açık limit emirleri tarar; BUY price ≤ market ise veya SELL price ≥ market ise atomic fill, locked balance düşülür, fee hesaplanır, transaction kaydı atılır, push notification gönderilir. Force-tick endpoint admin için. Partial fill desteklenir (filled_qty).
- Limit cancel: locked balance geri yatırılır.
- BERX: admin panelden manuel fiyat, otomatik simülasyon, push tick. Spot al-sat çalışır.
- Coin override mode: admin tüm/seçili coinler için yüzde uygula, tek coin fiyat ayarla, reset; snapshot rollback geçmişi.

### Wallet / Deposits / Withdrawals
- TRY/USDT/52 coin/BERX bakiyeleri, locked/available/total, P/L (cost basis).
- TRY yatırma: tutar + dekont (REFERANS KODU YOK), admin onaylı.
- TRY çekme: IBAN + admin onaylı.
- Kripto yatırma: admin yönetimli adres (per coin + network), TX hash claim.
- Kripto çekme: per-coin per-network fee + min, admin yönetimli.

### Networks & Addresses
- Coin networks (TRC20, ERC20, BEP20, Tron, Ethereum, BNB, Polygon, Solana, Avalanche, Arbitrum, Optimism, Base) admin yönetimli.
- Platform addresses (admin paneli): address, warning, min_deposit, deposit/withdraw enabled, **contract_address, explorer_url, memo_required, memo_label** (yeni).

### Live Chat
- Visitor (visitor_id) + auth kullanıcı destekli.
- Sağ alt floating bubble (settings.live_chat_enabled toggle).
- Admin paneli polling 4s (yeni daha hızlı), unread badge, status açık/beklemede/kapalı.

### Site Settings / Theme / SEO
- **35+ alanlı sistem ayarları** (admin paneli):
  - Marka: site_name, slogan, açıklama, logo_url, favicon_url, footer.
  - İletişim: contact_email, contact_phone, 4 sosyal medya.
  - Auth toggles: maintenance_mode, live_chat_enabled, kyc_enabled, email_verification_enabled/required, google_login_enabled, forgot_password_enabled, registration_enabled, robots_index.
  - Google: client_id, client_secret, redirect_uri.
  - Tema: primary/secondary/accent/BERX/bg/card/text + button/card radius + PWA renkleri.
  - SEO: global title/desc/keywords/og_image/twitter_image/canonical.
- **`/api/branding` public bundle** — frontend bootstrap'ta CSS variables + meta tags + favicon + theme color dinamik uygulanır.
- **Per-page SEO**: `/api/admin/seo/pages` CRUD; frontend `usePageSeo(slug)` hook ile her sayfa kendi başlık+description+og_image'ını uygular. 17 sayfa için seed edildi (home, wallet, trade, deposit, withdraw, about, fees, risk, help, faq, contact, security, blog, announcements, terms, privacy, markets).

### Media Upload (yeni)
- **`POST /api/admin/media/upload`**: multipart, sadece image/* + ico, max 4MB, güvenli isim, admin yönetimli, emergent storage'a yazar.
- **`GET /api/media/{path}`**: public proxy, 24h cache.
- Admin Site Ayarları'nda Logo + Favicon alanları yanında **"Dosya Yükle"** butonu.

### Live Activity (canlı akış)
- 4 saniyelik polling (önceki 12s'den). Gerçek trade'leri (admin override + limit engine fill'leri) gösterir.

### Public pages
- Hakkımızda, Blog, Kariyer, Basın, Yardım, SSS, İletişim, Güvenlik, Kullanım Şartları, Gizlilik, Risk Bildirimi, Ücretler, Duyurular — hepsi premium Türkçe içerikle.
- Giriş yapan kullanıcı tüm public sayfalara erişebilir.

## Bu turda (2026-02-14) eklenenler — UI/UX & Navigation Polish

### Logged-in user → Anasayfaya kolay dönüş
- `Sidebar`: Marka (logo) artık `<Link to="/">`. Nav'a en üste **"Anasayfa"** (House icon) eklendi (`data-testid="nav-home"`). Logo `settings.logo_url` varsa onu kullanıyor, yoksa default.
- `TopNav`: Mobil brand `<Link to="/">`. Desktop'ta yeni **"Anasayfa"** link butonu (`data-testid="topnav-home-link"`). Profil dropdown'ında da Anasayfa.
- `MobileBottomNav`: İlk sekme **Anasayfa** (House icon, `data-testid="mob-home"`).

### Mobil drawer artık dolu (`MobileDrawer.jsx` — yeni)
- Header: brand link + X kapat butonu.
- Logged-in user kartı: avatar + ad + email + 2 quick action (Cüzdanım, Panele Git).
- "HESABIM" bölümü (auth): Gösterge Paneli, Spot İşlem, Cüzdan, Gönder/Al, BERX Coin, KYC, Profil.
- "COINBERX" bölümü (herkese): Anasayfa, Piyasalar, Hakkımızda, Yardım Merkezi, SSS, Güvenlik, Blog, Duyurular, İletişim.
- Admin satırı (admin için): Yönetici Paneli.
- Footer: Çıkış Yap butonu + destek e-posta + telefon + versiyon.
- Drawer animations (`fadeIn`, `slideInLeft`) `index.css`'e eklendi.
- `Layout.jsx` yeniden yazıldı: `mobileOpen` state + `MobileDrawer` ile sidebar swap edildi.

### Default branding & favicon
- `SettingsContext`: `DEFAULT_LOGO_SVG` (Coinberx yeşil C logo) ve `DEFAULT_FAVICON_SVG` (green badge) inline base64 SVG olarak eklendi. Backend boş gönderse bile default uygulanıyor.
- `public/index.html`: title → "Coinberx | Güvenli ve Hızlı Kripto Para Borsası", `<link rel="icon">` + `apple-touch-icon` data: SVG, theme-color #16A34A.

### BERX coin icon premium
- `coinIcons.jsx`: BERX için harf rozeti yerine **inline SVG** — radial gold gradient + iç ring + Coinberx "B" form + uydu noktaları. Tüm coin listelerinde tutarlı görünüyor.

### Backend (server.py + networks.py)
- **Limit matching engine**: `_match_single_order`, `run_limit_matching_cycle`, `_limit_matching_loop` background task, admin force-tick endpoint.
- **Google OAuth config**: SettingsIn + DEFAULT_SETTINGS'e client_id/secret/redirect_uri eklendi; `/auth/google/status` yeni; `/auth/google/session` config-aware (410/503/501 net hata mesajları).
- **Media upload**: ALLOWED_MEDIA_MIME, MAX_MEDIA_BYTES, `POST /admin/media/upload`, `GET /admin/media`, `GET /media/{path}` public proxy.
- PUBLIC_BRANDING_KEYS güncellendi (google_client_id, google_redirect_uri public, secret değil).

### Frontend
- `SettingsContext` → `usePageSeo(slug)` hook eklendi.
- `InfoPage` slug parametresi alıyor, `usePageSeo` çağırıyor; tüm 13 info sayfasında slug verildi.
- Markets, Wallet, Trade, Deposit, Withdraw, Landing → `usePageSeo` eklendi.
- Admin SiteInfoPanel: Logo/Favicon "Dosya Yükle" + Google OAuth Yapılandırma kartı (client_id/secret/redirect_uri + canlı durum badge'i).
- Admin AddressesPanel: Contract Address, Explorer URL, Memo Required, Memo Label alanları eklendi.
- Login.jsx: `/auth/google/status` ile **koşullu Google butonu** (sadece available=true ise; Google logosu + accounts.google.com OAuth URL'i hazır).
- LiveActivity polling 12s → 4s.
- SupportWidget polling 8s → 4s.

## Manuel doğrulanan akışlar (bu tur)
1. ✅ **Limit BUY @ 1.05x market** → tick → **filled at market price** (better-for-user), wallet TRY-locked düşüldü, BTC eklendi.
2. ✅ **Limit SELL @ 10x market** → open (tetiklemedi, doğru).
3. ✅ **Google status**: default disabled → configured edildikten sonra available=true; client_id branding'a yansıdı; **client_secret YANSIMADI** (güvenlik); session endpoint config-aware 501 döndü.
4. ✅ **Media upload**: PNG kabul edildi (1x1 test), public proxy 69 byte döndü, content-type doğru; text/plain reddedildi.
5. ✅ Admin > Site Ayarları > Logo/Favicon "Dosya Yükle" butonu görünür.
6. ✅ Admin > Coin Adresleri > Contract/Explorer/Memo alanları görünür.
7. ✅ Admin > Ağlar destroy hatası YOK (cycle 3x).
8. ✅ **Page-level SEO**: 17 sayfa seed; tarayıcı title değişiyor → `/` → "Coinberx", `/wallet` → "Cüzdanım", `/trade/BTC` → "Spot İşlem", `/deposit` → "Para Yatırma", `/fees` → "Ücretler", `/risk` → "Risk Bildirimi", `/about` → "Hakkımızda".
9. ✅ Login: Google disabled → **butonu YOK**; "Şifremi unuttum" link mevcut.
10. ✅ **Premium UI** doğrulandı: Markets (Favoriler/Spot + TRY/USDT/BERX tab + sparkline + ikon), Wallet (Available/Locked/Total/TRY Değeri/24s + ikon), Deposit (sol form / sağ rehber, referans kodu YOK), Trade (chart + emir defteri + son işlemler).
11. ✅ **Canlı işlem akışı** sağ altta 4s polling ile sürekli güncelleniyor — gerçek admin trade'leri yansıyor.
12. ✅ Tüm bugün konsol logları **temiz** (`destroy is not a function` yok, TypeError yok).
13. ✅ Backend supervisor + frontend supervisor RUNNING.

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`

## Pending / Backlog (dürüstçe kalan)
- **WebSocket canlı destek**: hâlâ polling (4s'ye düşürüldü, gerçek-zamana yakın). True WebSocket sonraki adım.
- **Gerçek Google OAuth callback library entegrasyonu**: client_id/secret ayar altyapısı tamam, fakat code → id_token doğrulama için `google-auth` / `aiohttp` library kurulum + callback handler bekliyor. Admin "Yapılandırma Eksik / Tamam" durumu görür ve uyarılır.
- **Gerçek blockchain entegrasyonu**: crypto deposit/withdraw admin manuel onaylı (MVP).
- **Match engine: FIFO order book**: şu an market-tetikleyici model (BUY price ≤ market fill). Birden çok kullanıcı arası gerçek karşılıklı eşleşme için ileride iyileştirilebilir.
