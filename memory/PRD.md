# Coinberx — Turkish Crypto Exchange (PRD)

## Original problem statement
Full-stack Turkish crypto exchange ("Coinberx") with realistic production flow: JWT auth, real email verification, KYC uploads, TRY (IBAN) deposits/withdrawals, multi-network crypto support (TRC20, ERC20, BEP20), internal user-to-user transfers, custom platform token BERX with admin-controlled pricing/simulation, and a professional trading interface using real-time price APIs. UI must feel like a premium, native mobile trading app, fully in Turkish. **Latest direction (2026-06-07):** light corporate theme inspired by CoinTR, remove VIP tier visuals, no fake live activity data, fix Support page crash, add Admin Activity Logging, add BERX auto-simulation, add floating live support widget.

## User decisions (locked)
- Price data: Binance public API (`data-api.binance.vision`)
- Auth: JWT (email/password) only — Google Auth removed
- Email: Resend (key optional; otherwise logged)
- KYC upload: Emergent Object Storage (real files)
- Admin seed: `admin@coinberx.com / Admin123!`
- No 2FA
- KYC enforcement toggleable by admin
- **Theme: Light (default & only)** — corporate green primary (#16A34A), gold accent for BERX (#D4A017)
- No fake data anywhere; no testing-agent calls per user request

## Architecture
- **Backend** (`/app/backend`): FastAPI + Motor (MongoDB). Modules: `server.py`, `market_data.py`, `storage.py`, `email_service.py`, `berx.py`, `networks.py`. Background asyncio task drives BERX random-walk auto-simulation.
- **Frontend** (`/app/frontend`): React 19 + Tailwind + Shadcn + Recharts + `lightweight-charts` + `@phosphor-icons/react` + Sonner (light theme).
- DB collections: `users`, `wallets`, `sessions`, `kyc_requests`, `deposits`, `withdrawals`, `orders`, `transactions`, `watchlist`, `notifications`, `bank_refs`, `login_history`, `login_attempts`, `cost_basis`, `system_settings`, `support_messages`, `internal_transfers`, `crypto_withdrawals`, `deposit_addresses`, `coin_networks`, `berx_settings`, `berx_ticks`, **`admin_activity_logs`** (new).

## Implemented features
### Auth & profile
- Email/password register → auto-login, code emailed/logged
- `/auth/verify-email`, `/auth/resend-code`, brute-force lockout
- Admin seeding at startup

### Wallet & accounting
- TRY + 15 cryptos + BERX, locked/available, live TRY valuation, cost basis P/L

### TRY deposit/withdraw via IBAN
- Per-user reference codes, dekont upload, admin queue

### Trading
- Live Binance TRY prices, candlestick chart, market/limit orders, 0.1% fee

### KYC
- ID + selfie upload, admin approval

### Multi-network crypto
- TRC20, ERC20, BEP20 networks; deterministic deposit addresses; admin-managed fees/min/confirm minutes

### Internal transfers
- Email/userId/referral lookup, fee, sender/receiver wallet updates

### BERX coin
- Manual price set, percent adjust, history klines (5m–1d)
- **NEW:** Auto-simulation with min/max bounds, daily change cap, configurable volatility & trend drift, run via asyncio loop

### Admin panel (light theme)
Tabs: Özet · Kullanıcılar · KYC · Yatırmalar · Çekmeler · Kripto Çekimleri · Transferler · Ağlar · BERX Coin · Destek · **Etkinlik Kayıtları (new)** · Ayarlar

### Activity logging
- Every kyc/deposit/withdrawal/crypto-withdrawal/network/settings/BERX action persists `{admin, action, entity_type, entity_id, details, ip_address, user_agent, created_at}`
- New `GET /api/admin/activity-logs` endpoint with optional filters
- Admin UI table with filtering

### Live support widget
- Floating green bubble bottom-right of every authenticated page
- Two tabs: Yeni Mesaj (create ticket) and Mesajlarım (list with status badges)
- Uses real `/support/message` + `/support/messages` endpoints
- Phone + e-mail printed inside widget

### Real (not fake) platform activity feed
- `GET /api/platform/recent-trades` returns latest real spot trades anonymised ("Mehmet O." style mask)
- `LiveActivity.jsx` only renders when there are real trades; otherwise it stays hidden
- Removed all hardcoded fake names/amounts

### Light theme transformation (2026-06-07)
- `index.css` rewritten: white/slate palette, green primary, gold BERX accent
- Bulk colour migration across every page/component (sidebar, topnav, dashboard, markets, trade, wallet, deposit, withdraw, transfer, KYC, support, admin, landing, info pages, mobile nav, modals)
- Recharts tooltips set to white surfaces
- Sonner toaster switched to light theme

### Landing redesign (CoinTR-inspired, light)
- Clean white header with new nav: Keşfet, Piyasalar, Spot İşlem, Neden Coinberx, Güvenlik, Blog
- Hero with live BTC card, green primary CTA
- Sparkline rails: Yükselenler / Düşenler / Trend Coinler
- BERX Spotlight with gold accent
- 3-step "Nasıl Çalışır", Güvenlik & Uyum, Coinberx Akademi blog cards (replaced fake testimonials/fake user counts)
- Footer without API Docs

### TopNav profile dropdown (CoinTR-style)
- KYC status pill, notifications bell, profile menu with Profilim/KYC/Cüzdanım/Destek/Çıkış

### Sidebar additions
- Dedicated "Spot İşlem" + "BERX Coin" + "Gönder / Al" entries

## Critical bug fix
- `pages/Support.jsx`: `useEffect(load, [])` returned a Promise → React crash `destroy is not a function`. Fixed to `useEffect(() => { load(); }, [])`.

## Deferred / backlog
- Markets and Wallet pages: deeper CoinTR-style table+sidebar redesign (currently themed but original layout retained)
- Deposit/Withdraw page redesign with split panels
- WebSocket live price ticks
- Limit order matching engine
- Floating widget already real; could add WS push for unread reply badge
- VIP tier system: backend code still computes tiers but UI no longer surfaces them (Dashboard card removed, Landing tier cards replaced). Backend `/api/user/tier` and `compute_user_tier` kept for fee-discount logic at trade time.

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`
- Regular users created via Register page

## Recent verification (2026-06-07)
- BERX auto-simulation: enabled with 3s interval → price moved 1.022 → 1.037 in 8s ✓
- Admin activity logs: settings.update and berx.simulation logged with real IP ✓
- Platform recent trades: returns empty list (no fake data) ✓
- Light theme verified on landing, login, dashboard, admin, support widget ✓
- Support page no longer crashes ✓
