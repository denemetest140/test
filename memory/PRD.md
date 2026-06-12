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
- Google ile giriş kaldırıldı (sadece e-posta/şifre).

## Architecture
- Backend: FastAPI + Motor (MongoDB). Dosyalar: `server.py` (~2150 LOC), `market_data.py`, `storage.py`, `email_service.py`, `berx.py`, `networks.py`. BERX simülasyonu için asyncio loop.
- Frontend: React 19 + Tailwind + Shadcn + lightweight-charts + Phosphor Icons + sonner.
- Database: `users`, `wallets`, `orders`, `transactions`, `cost_basis`, `deposits`, `withdrawals`, `kyc_requests`, `crypto_withdrawals`, `crypto_deposits`, `platform_addresses`, `coin_networks`, `networks`, `internal_transfers`, `admin_activity_logs`, `support_messages`, `live_chat_sessions`, `live_chat_messages`, `berx_settings`, `berx_ticks`.

## Implemented features
(Önceki PRD bölümleri korundu — bkz. `/app/memory/CHANGELOG.md` için detaylı liste)
- Auth: JWT e-posta+şifre, brute-force koruması, e-posta doğrulama, admin seed.
- KYC: belge yükleme + admin onay akışı.
- Wallet: TRY + 50 kripto + BERX, locked/available/total, P/L.
- Trading: Market/Limit, %0,1 komisyon, ücret düzeyleri (UI'da gizli).
- IBAN deposit (referans kodu YOK) + withdrawal.
- Crypto deposit (admin-yönetimli adres + tx-hash claim) + crypto withdrawal.
- Markets: 50+ coin, sparkline kolonu, sıralama, gerçek ikonlar.
- Premium UI: Landing, Dashboard, Markets, Wallet, Deposit, Withdraw, Trade.
- Live Chat: ziyaretçi (visitor_id) + kullanıcı, sağ-alt floating bubble, admin paneli polling tabanlı.
- Admin: KYC, deposit/withdrawal, crypto deposit/withdrawal, networks, platform addresses, BERX (manuel + auto sim), activity logs, live chat.
- Real Coin Icons: `lib/coinIcons.jsx` ile spothq CDN; BERX için özel altın gradient.
- Chart cleanup fix: lightweight-charts "Object is disposed" hatası kapatıldı (disposed flag + try/catch).

## Code Quality refactoring (THIS SESSION — 2026-02)
1. ✅ `is` vs `==`: Mevcut tüm `is` kullanımları `is None` ile (PEP 8 doğru), düzeltilecek bir şey yok. Linter (ruff) temiz.
2. ✅ `create_order()` (118 satır) → 4 yardımcı fonksiyon: `_validate_order_input`, `_compute_qty_and_amount`, `_execute_market_order`, `_lock_funds_for_limit`. Ana endpoint ~40 satıra düştü.
3. ✅ `live_chat_start()` → `_find_existing_chat_session` + `_build_new_chat_session` yardımcılarına bölündü.
4. ✅ `get_current_user` → `_extract_bearer_token`, `_user_from_jwt`, `_user_from_session` yardımcılarına bölündü.
5. ✅ `crypto_withdraw` → `_resolve_withdrawal_network` + `_coin_price_try` yardımcılarına bölündü.
6. ✅ `create_transfer` → `_lookup_user_by_handle` yardımcısına bölündü.
7. ✅ `fetch_all_tickers` (market_data.py) → `_binance_symbols_param` + `_assemble_ticker_row` yardımcılarına bölündü.
8. ✅ `berx.py`: Tüm public fonksiyonlara type hint eklendi (Any, List, Dict, Optional).
9. ✅ `networks.py upsert_platform_address`: 5 keyword arg yerine `PlatformAddressPayload` dataclass'ına gruplandı; caller (`server.py`) buna göre güncellendi.
10. ✅ API davranışı 1-1 korundu (10+ curl testi: market buy/sell filled, limit open, cancel, transfer, crypto-withdraw, platform-address upsert/delete, live-chat start/message, KYC error paths).

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`
- Test User: `testreceiver@coinberx.com` / `Test123!` (oluşturuldu, KYC yok)

## Manuel doğrulanan akışlar (refactor sonrası)
1. ✅ Markets endpoint 50+ coin + BERX döner.
2. ✅ Admin login → JWT döner.
3. ✅ Wallet 17 asset listeler.
4. ✅ Live chat: ziyaretçi start → message → admin liste, 4 session göründü.
5. ✅ Admin platform-addresses PUT/GET/DELETE çalışıyor.
6. ✅ Coin networks USDT için TRC20 adres dolu, ERC20/BEP20 boş.
7. ✅ BERX price endpoint çalışıyor.
8. ✅ Settings public döner.
9. ✅ Trade market BUY 100 TRY BTC → filled, fee 0.075 TRY.
10. ✅ Trade limit BUY → open, cancel → ok.
11. ✅ Trade market SELL 0.0001 BTC → filled.
12. ✅ Crypto withdrawal USDT TRC20 10 → pending, fee_coin hesaplandı.
13. ✅ Transfer 0.0001 BTC alıcıya → fee 5e-8.
14. ✅ Validation: invalid side / yetersiz bakiye / alıcı bulunamadı / kendine transfer — hepsi 400 doğru hata.
15. ✅ Landing page yüklendi, canlı destek bubble görünür.
16. ✅ Backend supervisor logları temiz.

## Pending / Backlog
- WebSocket: Şu an polling. Ölçeklenince socket.io/SSE.
- Gerçek blockchain entegrasyonu: Crypto deposit/withdraw admin manuel onaylı (MVP).
- Match engine: limit emirler şu an sırada bekliyor, otomatik eşleşme yok.
- Password reset UI premium tasarımı.
- Mobil bottom-sheet detayları.
