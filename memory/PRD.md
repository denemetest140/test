# Coinberx — Turkish Crypto Exchange (PRD)

## Vision
Coinberx, Türk yatırımcılar için açık tema, kurumsal, premium görünümlü, mobil uygulamaya çevrilebilir mimaride bir kripto borsasıdır. CoinTR / Binance / Binance TR hissi alır ama özgün marka kalır. Sahte veri yok, gerçek borsa akışları çalışır.

## User decisions (locked)
- Açık tema (light) varsayılan ve admin panelden değiştirilebilir.
- Renk paleti: kurumsal yeşil #16A34A (primary) + altın #D4A017 (BERX) — admin override edilebilir.
- Test/CI yok — kullanıcı isteğiyle, testing agent çağrılmıyor.
- Türkçe dil.
- VIP / kademe yok (UI'dan tamamen kaldırıldı).
- Fake operatör veya fake trade akışı yok.
- TRY deposit referans kodu yok.
- Google login kaldırılmıştı; admin panelden tekrar enable toggle eklendi (flag).

## Architecture
- Backend: FastAPI + Motor (MongoDB). Dosyalar: `server.py` (~2470 LOC), `market_data.py`, `storage.py`, `email_service.py`, `berx.py`, `networks.py`.
- Frontend: React 19 + Tailwind + Shadcn + lightweight-charts + Phosphor Icons + sonner. SettingsContext + AuthContext.
- Database collections: `users`, `wallets`, `orders`, `transactions`, `cost_basis`, `deposits`, `withdrawals`, `kyc_requests`, `crypto_withdrawals`, `crypto_deposits`, `platform_addresses`, `coin_networks`, `networks`, `internal_transfers`, `admin_activity_logs`, `support_messages`, `live_chat_sessions`, `live_chat_messages`, `berx_settings`, `berx_ticks`, `system_settings`, **`password_resets`**, **`price_overrides`**, **`price_snapshots`**, **`seo_pages`**.

## Bu turda eklenen / değiştirilen (2026-02-13)

### Backend
- `DEFAULT_SETTINGS` 35+ alana genişledi (brand, theme, SEO, auth toggles, price_mode).
- `SettingsIn` 40+ field destekliyor (PATCH /admin/settings).
- **/api/branding** (public) — Tüm whitelist edilmiş brand/theme/SEO/auth flag bundle.
- **POST /api/auth/password/forgot** — token oluştur (32 byte url-safe), 30 dk geçerli, link e-postaya gönderilir (dev mode log'a).
- **POST /api/auth/password/reset** — token doğrula, şifre 8+ char, bcrypt ile güncelle, token used=true.
- **GET /api/admin/prices/overrides** — current override + son 20 snapshot.
- **POST /api/admin/prices/bulk** — actions: `percent_all`, `percent_selected` (symbols listesi), `set_one` (sym+TRY), `reset`.
- **POST /api/admin/prices/rollback/{snapshot_id}** — herhangi snapshot'a geri dön.
- **/api/markets** ve **/api/markets/{symbol}** — override varsa price_try ve change_24h yeniden hesaplanıyor, `override: true` flag'i eklendi.
- **PATCH /api/admin/users/{user_id}** — name, email, phone, role, kyc_status, account_status, email_verified.
- **DELETE /api/admin/users/{user_id}** — soft delete (deleted=true, email anonimize, account_status=banned). Admin silinemez.
- **GET /api/admin/users/{user_id}** — user + wallet + tx_count + chat_count.
- **GET /api/admin/users?include_deleted=true** — silinmiş kullanıcıları da listele.
- Login flow: deleted veya banned user 403 alır.
- **PUT /api/admin/seo/pages** — page-level SEO upsert (slug, title, description, image).
- **GET /api/seo/pages**, **GET /api/seo/pages/{slug}**, **DELETE /api/admin/seo/pages/{slug}**.
- **PlatformAddressIn** + **PlatformAddressPayload** dataclass: contract_address, explorer_url, memo_required, memo_label eklendi.
- Startup index: `password_resets.token`, `seo_pages.slug`, `price_snapshots.created_at`.

### Frontend
- **`SettingsContext`** (yeni): /api/branding'ı yükler, CSS variables (`--cb-primary`, `--cb-card`, vs.) + `document.title` + meta description / og:title / og:description / og:image / twitter:image / theme-color / favicon dinamik uygular.
- **`MaintenanceGate`**: maintenance_mode AÇ ise admin dışındaki herkese tek-sayfa bakım ekranı gösterir.
- **`/forgot-password`** ve **`/reset-password`** sayfaları (yeni).
- Login sayfasında "Şifremi unuttum" link (data-testid="login-forgot").
- Login sayfası `forgot_password_enabled` admin toggle'ına saygı duyar.
- Yeni admin tab'ları: **Coin Fiyatları (bulkprice)**, **Site Ayarları (siteinfo)**, **Tema (theme)**, **SEO (seo)**.
- **UsersPanel** yenilendi: arama, deleted toggle, Detay / Düzenle / Sil modalları (UserEditModal + UserDetailModal).
- **BulkPricePanel**: yüzde girdisi, "Tüm Coinleri Uygula", "Seçilenlere Uygula", "Tek Coin Fiyat Set", "Override'ları Sıfırla", snapshot rollback geçmişi.
- **SiteInfoPanel**: marka kimliği (logo, slogan, favicon, açıklama, footer), iletişim (e-posta, telefon), sosyal medya (Twitter/Telegram/Instagram/YouTube), 9 özellik toggle'ı (maintenance, live_chat, kyc, email_verification, email_required, google, forgot_password, registration, robots_index).
- **ThemePanel**: 9 renk picker + 2 radius (button & card). Save → CSS variables anında uygulanır.
- **SeoPanel**: global SEO (title, description, keywords, OG/Twitter image, canonical) + page-bazlı SEO CRUD.
- **InfoPages** zenginleştirildi: Security, Terms, Privacy, Risk, Fees, Announcements sayfaları eklendi (Türkçe, gerçek borsa hissi).
- App.js: SettingsProvider en üstte, ProtectedRoute admin için route, /forgot-password & /reset-password public; tüm public route'ları logged-in user da görebilir.

### Önceki turdan korunan
- `destroy is not a function` hata düzeltmesi — Admin/KYC/Transfer useEffect cleanup'ları korundu.
- Logged-in user public landing erişimi (Root → Landing, koşullu CTA).
- Code Quality refactor (önceki turdan): create_order, live_chat_start, get_current_user, crypto_withdraw, create_transfer, fetch_all_tickers refactor edildi; berx.py type hints; networks.py PlatformAddressPayload dataclass.

## Manuel doğrulanan akışlar (bu tur)
1. ✅ Login admin → Admin paneli 18 sekme.
2. ✅ Ağlar sekmesi açıldı → KYC → Ağlar → Coin Adresleri → Ağlar cycle hatasız. Console temiz.
3. ✅ Coin Fiyatları sekmesi açıldı, 52 coin görünüyor, snapshot yok.
4. ✅ POST percent_all +5% → BTC fiyatı 2.94M → 3.09M, override flag aktif.
5. ✅ POST set_one ETH 100000 → ETH override 100000.
6. ✅ POST rollback → ilk snapshot'a dönüldü (empty).
7. ✅ POST reset → tüm overrides temizlendi.
8. ✅ Site Ayarları → logo/colors/kyc_enabled/google_login_enabled PATCH başarılı, /branding response güncellendi.
9. ✅ Tema sekmesi → 9 color picker görünüyor, kaydet → CSS vars uygulanıyor.
10. ✅ SEO sekmesi → global SEO + page-level SEO CRUD.
11. ✅ /forgot-password → "Bağlantı Gönder" → success tag (data-testid="forgot-sent").
12. ✅ Backend: password_resets token oluşturulup reset endpoint yeni şifreyi kabul etti, yeni şifre ile login OK.
13. ✅ /admin/users/{id} PATCH (kyc_status=approved, phone, name) — başarılı.
14. ✅ DELETE /admin/users/{id} — soft delete, email anonimleşti, login 403.
15. ✅ /admin/users (default) silinmişi dışarıda bırakıyor; ?include_deleted=true silinmişi de getiriyor.
16. ✅ /about, /risk, /fees public sayfaları premium görünüyor, dolu içerik, document.title default global SEO'dan geliyor.
17. ✅ Public branding endpoint logo/colors değiştiğinde frontend'i yansıtıyor (CSS variables runtime'da güncelleniyor).
18. ✅ Backend supervisor + frontend supervisor RUNNING, webpack compile temiz (sadece pre-existing exhaustive-deps uyarısı).

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`
- Test User (soft deleted in this turn — recreate if test gerekirse): `testreceiver@coinberx.com`

## Pending / Backlog
- WebSocket: Şu an polling. Ölçeklenince socket.io/SSE.
- Gerçek blockchain entegrasyonu: Crypto deposit/withdraw admin manuel onaylı (MVP).
- Match engine: limit emirler şu an sırada bekliyor, otomatik eşleşme yok.
- Google login: backend toggle var ama OAuth callback şu an 410 döner. Kullanıcı OAuth client kurarsa enable edilecek.
- Logo/favicon yükleme: şu an URL girilerek çalışıyor. Asıl dosya upload S3/storage entegrasyonu eklenebilir.
- BERX management UI ileri (admin override sim/manual/hybrid mode toggle): backend'de zaten var, admin BERX panelinde daha kompakt UI yapılabilir.
- Mobile bottom-sheet detay polish.
