# Coinberx — Turkish Crypto Exchange (PRD)

## Vision
Coinberx, Türk yatırımcılar için açık tema, kurumsal, premium görünümlü, mobil uygulamaya çevrilebilir mimaride bir kripto borsasıdır. CoinTR / Binance / Binance TR hissi alır ama özgün marka kalır. Sahte veri yok, gerçek borsa akışları çalışır.

## User decisions (locked)
- Açık tema (light) varsayılan ve tek tema.
- Renk paleti: kurumsal yeşil #16A34A (primary) + altın #D4A017 (BERX aksanı).
- Test/CI yok — kullanıcı isteğiyle.
- Türkçe dil.
- VIP / kademe yok (UI'dan tamamen kaldırıldı).
- Fake operatör veya fake trade akışı yok.
- Deposit referans kodu istenmez (sadece IBAN + tutar + dekont).

## Architecture (özet)
- Backend: FastAPI + Motor (MongoDB). `server.py`, `market_data.py`, `storage.py`, `email_service.py`, `berx.py`, `networks.py`. `asyncio` BERX simülasyon loop'u.
- Frontend: React 19 + Tailwind + Shadcn + lightweight-charts + Phosphor Icons + sonner.
- Database: yeni koleksiyonlar `admin_activity_logs`, `live_chat_sessions`, `live_chat_messages`, `platform_addresses`, `crypto_deposits`, `berx_settings.simulation`.

## Implemented features
### Auth & Profile (mevcut, korundu)
- JWT email/password kayıt + login + email doğrulama + admin seed + brute force koruması.
- Profile/oturum yönetimi, KYC durumu top-bar pill'inde gösterilir.

### Wallet & Trading (mevcut, light tema)
- TRY + 16+ kripto + BERX cüzdan, locked/available/total, gerçek zamanlı TRY değeri, cost basis P/L.
- Spot trading + lightweight-charts grafik (artık "Object is disposed" hatası yok).
- Limit / market emirler, %0,1 komisyon.

### Cüzdan sayfası (yeni)
- CoinTR ilhamlı sol sidebar (Genel Bakış / Spot Hesabı / Yatırma / Çekme / Transfer / İşlem Kayıtları).
- Tahmini Bakiye + ≈USDT + Kâr/Zarar + 4 hızlı işlem butonu (Kripto Al, Yatır, Çek, Gönder).
- Gerçek coin ikonlu varlık tablosu (Available / Locked / Total / TRY / 24s / İşlem butonları).
- Bakiye gizleme toggle, arama, "Sadece sahip olduklarım" filtresi.

### Markets sayfası (yeni)
- Breadcrumb "Coinberx / Piyasalar / Piyasa Verileri".
- Favoriler / Spot tabları, TRY / USDT / BERX quote filtreleri.
- Sıralanabilir kolonlar (Fiyat, Değişim, Hacim, İsim).
- Gerçek coin ikonları (BTC, ETH, USDT, BNB, SOL, XRP, DOGE, …).
- Sparkline mini grafik (`GET /api/markets-sparklines`).
- "İşlem Yap" CTA.

### Deposit sayfası (yeni)
- 2 sekme: TL Yatır / Kripto Yatır.
- TL akışı: Tutar + Banka info kartı + Dekont yükleme. **Referans kodu tamamen kaldırıldı**, ne UI'da ne backend'de zorunlu.
- Kripto akışı: Coin grid → Network seçimi → adminin tanımladığı adres + uyarı + min limit + onay süresi → Tx hash + Tutar. Adres yoksa açık boş durum.
- Geçmiş tablosu her iki tip için ayrı.

### Withdraw sayfası (yeni)
- 2 sekme: TL Çek / Kripto Çek.
- TL: Tutar + IBAN + banka adı + hesap sahibi + komisyon önizleme + net alacak.
- Kripto: Coin grid → Network → Adres → Tutar → Fee/Min/Net/Onay özet kutusu.
- Geçmiş tabloları durum etiketleriyle (Beklemede / Onaylandı / Reddedildi).

### Landing (yeniden tasarım)
- Sade hero + gerçek coin ikonlu BTC/TRY canlı kartı + Al/Sat CTA.
- Yatay ticker (BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOGE, AVAX, MATIC, …).
- "Bugün öne çıkan coinler" — Top Gainer / Top Loser / En Çok Hacim / Trend.
- Yükselenler / Düşenler / Trend Coinler scroll rail (resmi ikonlu, sparkline'lı).
- 3 Adımda Başla + Güvenlik & Uyum kartları + Coinberx Akademi blog kartları.
- Footer.
- Tüm fake "10.000+ kullanıcı / 6 testimonial" blokları çıkarıldı.
- BERX Spotlight kartı altın aksanlı, BERX brand renginde.

### Canlı Destek Sistemi (YENİ — komple)
- Sağ-alt yeşil floating bubble her sayfada (visitor + giriş yapan kullanıcı).
- Ziyaretçi flow: ad soyad + opsiyonel iletişim → localStorage'a `visitor_id` kaydı → tarayıcı yenilense bile sohbet devam.
- Kullanıcı flow: oturumdaki kullanıcı bilgisiyle direkt başlar, "Tam Sayfa" linkiyle /support sayfasına gider.
- Mesajlaşma: 4 saniyelik polling, balon görünümlü chat (kullanıcı yeşil sağda, admin beyaz solda).
- Admin yanıtı yoksa kibar bekleme metni: "Destek ekibimiz en kısa sürede yanıt verecek".
- Mobilde alt navigation ile çakışmaz, container `bottom-20 lg:bottom-6 right-4`.
- Okunmamış mesaj badge'i (>0 olduğunda kırmızı sayaç).

### Admin Canlı Destek Paneli (YENİ)
- Sol listede tüm sohbetler: filtre Tümü/Bekleyen/Açık/Kapalı, isim, e-mail/iletişim, status, son mesaj zamanı, okunmamış sayaç.
- Sağ panelde seçili sohbet: isim + ÜYE/Ziyaretçi rozeti + e-mail/contact + IP + UA + sayfa URL + status. Admin yanıtla / Kapat / Yeniden aç. Enter ile gönder, Shift+Enter ile yeni satır.
- Admin Özet sekmesinde "Canlı Destek Özeti" kartı: bekleyen/açık/kapalı sayıları + son 8 mesaj.

### Admin Coin-Network Adres Yönetimi (YENİ)
- "Coin Adresleri" sekmesi.
- Sol panelde form: Coin seç (25+ coin), Network seç (sistemde tanımlı ağlar), Deposit Adresi, Uyarı/Açıklama, Min Yatırma, Yatırma aktif, Çekim aktif.
- Sağ panelde tablo: tüm Coin+Network kombinasyonları, edit/sil aksiyonları, D/W aktiflik etiketleri.
- Kullanıcı tarafında: coin+network seçilince admin'in girdiği gerçek adres gösterilir, yoksa "Bu coin/ağ için yatırma adresi henüz tanımlanmamış" boş durumu. Fake adres üretimi yok.

### Network mimarisi (genişletildi)
- DEFAULT_NETWORKS: TRC20, ERC20, BEP20, BTC, SOL, POLYGON, ARBITRUM, OPTIMISM, BASE, AVAX, BERX.
- Her ağ için fee/min/onay süresi/format ayarı admin panelden değiştirilebilir.
- Coin-network eşleştirmesi admin tarafından düzenlenebilir.

### Coin ikon sistemi (YENİ)
- Merkezi `lib/coinIcons.jsx` (spothq/cryptocurrency-icons jsDelivr CDN).
- BERX için özel altın gradient marka rozeti.
- Bilinmeyen semboller için marka renkli harf avatarı fallback.
- Markets / Wallet / Deposit / Withdraw / Trade / Landing / History dahil tüm sayfalarda aynı `<CoinIcon symbol size/>` API'si.

### BERX yönetimi (önceki turda eklendi, korundu)
- Manuel set / yüzde adjust, hızlı +/-% butonları.
- Otomatik simülasyon: Manuel/Otomatik mod, enabled toggle, min/max fiyat, günlük cap, tick aralığı, volatilite, trend drift.
- Background asyncio loop random-walk fiyat üretir.

### Admin Activity Logs (önceki turda)
- Tüm admin işlemleri loglanır (KYC, deposit, withdrawal, crypto-withdrawal, network, settings, BERX, platform_address, live_chat).
- IP + UA + zaman + detay ile tablo. Filtre.

### Charts (kritik bug fix)
- lightweight-charts cleanup düzeltildi:
  - `disposed` flag ile resize callback korunuyor.
  - `try/catch` ile `chart.remove()`, `applyOptions`, `setData` çevrelendi.
  - Symbol değişiminde eski request iptali.
  - Strict Mode double-mount güvenli.

### VIP (tamamen kaldırıldı)
- Dashboard VIP kartı silindi.
- Landing'de Silver/Gold/VIP indirim kademe kartları yerine "düşük komisyon / yerel coin / 7-24 likidite" kartları.
- Backend tier hesabı fee indirimi için kalmaya devam ediyor (UI'da görünmez).

### Real-data live activity (önceki turda)
- LiveActivity gerçek `/api/platform/recent-trades` çağırır, kullanıcı adlarını "K***" şeklinde maskeler, veri yoksa widget hiç görünmez.

## Critical bug fixes (bu turda)
1. **Support sayfası `destroy is not a function`** → `useEffect(() => { load(); }, [])` (önceki turda).
2. **Trade chart `Object is disposed`** → cleanup'a disposed flag + try/catch + sym değişiminde cancel.
3. **Reference code tamamen kaldırıldı** → `/deposits/bank-info` artık ref code dönmüyor, `POST /deposits` ref code istemiyor, admin onay akışında `dep.get("reference_code")` opsiyonel.

## New/changed endpoints (bu tur)
- `GET /api/admin/platform-addresses` — Tüm coin-ağ adresleri listesi (admin)
- `PUT /api/admin/platform-addresses` — Coin-ağ adresi ekle/güncelle (admin)
- `DELETE /api/admin/platform-addresses/{symbol}/{network}` — Adres sil (admin)
- `GET /api/coins/{symbol}/networks` — Artık `platform_address` alanını içerir
- `GET /api/wallet/deposit-address` — Sadece admin'in tanımladığı adresi döner; yoksa 404
- `POST /api/wallet/crypto-deposits` — Kullanıcı kripto yatırma talebi (tx hash + tutar)
- `GET /api/wallet/crypto-deposits` — Kullanıcının kripto yatırma geçmişi
- `GET /api/admin/crypto-deposits` — Tüm kripto yatırma talepleri (admin)
- `PATCH /api/admin/crypto-deposits/{id}` — Onayla/Reddet (bakiyeye yansıtır)
- `POST /api/live-chat/start` — Sohbet başlat (visitor veya user)
- `POST /api/live-chat/message` — Mesaj gönder (visitor veya user)
- `GET /api/live-chat/poll?session_id&visitor_id&since` — Mesajları çek (polling)
- `GET /api/admin/live-chat/sessions[?status]` — Tüm sohbetler
- `GET /api/admin/live-chat/sessions/{id}` — Sohbet detayı + okuma işaretle
- `POST /api/admin/live-chat/sessions/{id}/reply` — Admin yanıt
- `PATCH /api/admin/live-chat/sessions/{id}/status` — Açık/Bekleyen/Kapalı
- `GET /api/admin/live-chat/stats` — Özet (open/pending/closed/24s mesaj/recent)
- `GET /api/markets-sparklines?limit=N` — Tüm coinlerin sparkline serileri (object)
- `GET /api/wallet/crypto-withdrawals` — Alias (eski `/crypto-withdrawals` korundu)
- `POST /api/wallet/crypto-withdrawals` — Alias

## Database changes
- `platform_addresses` koleksiyonu (`symbol` + `network` unique index)
- `crypto_deposits` koleksiyonu
- `live_chat_sessions` koleksiyonu (`session_id` unique, `visitor_id` index, `status+last_message_at` index)
- `live_chat_messages` koleksiyonu (`session_id+created_at` index)
- `admin_activity_logs` koleksiyonu (önceki tur)
- `berx_settings._id=global.simulation` alt belgesi (önceki tur)

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`

## Kurulum / VPS (Production)
```bash
# 1) Ortam
git clone <repo>
cd /app

# 2) Backend
cd /app/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# .env içine:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=coinberx
# JWT_SECRET=<32 byte random>
# RESEND_API_KEY=<opsiyonel>
# (Object storage env: PROJECT_ID, EMERGENT_OBJECT_STORAGE_URL vs.)

# 3) Frontend
cd /app/frontend
yarn install
# .env içinde REACT_APP_BACKEND_URL=https://api.coinberx.com
yarn build  # production
# veya geliştirme için: yarn start (port 3000)

# 4) Supervisor (production)
# /etc/supervisor/conf.d/coinberx.conf içine backend + frontend programlarını
# bu projedeki örneğe göre tanımlayın
sudo supervisorctl reload

# 5) MongoDB indekslerin otomatik startup'ta oluştuğunu doğrula
curl http://localhost:8001/api/markets | head -c 200
```

## Manuel doğrulanan akışlar (bu tur)
1. `PUT /api/admin/platform-addresses` ile USDT/TRC20 adresi eklendi ve listede göründü ✓
2. `GET /api/coins/USDT/networks` `platform_address` ile birlikte tüm ağları döndü ✓
3. `GET /api/markets-sparklines` 50+ coin sparkline serisi döndürdü ✓
4. Ziyaretçi olarak `POST /live-chat/start` ile session açıldı, mesaj gönderildi, admin yanıtladı, ziyaretçi polling ile 2 mesajı aldı ✓
5. Admin panel `Canlı Destek` sekmesinde 2 sohbet listelendi, Mehmet O konuşması açıldı, IP/UA/sayfa görünüyor, admin yanıtı timestamp'le görünüyor ✓
6. Admin panel `Coin Adresleri` sekmesi form + tablo birlikte çalışıyor ✓
7. Landing'de gerçek coin ikonları görünüyor (BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOGE, AVAX) ✓
8. Markets sayfası "Piyasa Verileri" başlığıyla, breadcrumb, TRY/USDT/BERX filtreleri, gerçek ikonlar, sparkline kolonu, sıralama ile çalışıyor ✓
9. Wallet sayfası CoinTR-style sidebar + bakiye gizleme + filtreleme çalışıyor ✓
10. Deposit/Kripto Yatır admin'in tanımladığı adresi gösteriyor, uyarı/min limit'i basıyor, Tx hash zorunlu ✓
11. TRY Yatır akışında referans kodu yok, sadece tutar + IBAN + dekont ✓
12. Backend supervisor ve frontend webpack başarıyla derliyor; supervisor logları temiz ✓

## Kalan eksikler (dürüst liste)
- WebSocket: Şu an polling. Ölçeklenince socket.io/SSE'ye geçirmek faydalı olur.
- Gerçek blockchain entegrasyonu: Crypto deposit/withdraw admin manuel onaylı; blockchain'e broadcast yok (kasıtlı, MVP düzeyi).
- Order book ve son işlemler component'leri mevcut ama gerçek match engine yok (limit emirler sırada bekler).
- Mobil bottom sheet pattern detaylandırılabilir; mevcut MobileBottomNav iyi durumda.
- Email doğrulama / şifre sıfırlama akışları mevcut (önceki turda); password reset UI sayfası ileride premium tasarıma kavuşturulabilir.
