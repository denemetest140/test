# Coinberx — Turkish Crypto Exchange (PRD)

## Original problem statement
Full-stack crypto trading web application similar to Binance for Turkish users. Platform name: **Coinberx**. Dark premium theme. Must be fully functional: real auth, KYC, IBAN deposits/withdrawals, trading with live Binance prices, admin panel. All UI in Turkish. Production-ready, not mock.

## User decisions (locked)
- Price data: Binance public API (`data-api.binance.vision`)
- Auth: JWT (email/password) + Emergent Google Auth
- Email: Resend — key can be added later; code is logged until set
- KYC upload: Emergent Object Storage (real files)
- Admin seed: `admin@coinberx.com / Admin123!`
- No 2FA (removed)
- KYC enforcement toggleable by admin (settings panel)

## Architecture
- **Backend** (`/app/backend`): FastAPI + Motor (MongoDB). Modules: `server.py`, `market_data.py` (Binance proxy w/ 5s-8s cache), `storage.py` (Emergent object storage), `email_service.py` (Resend).
- **Frontend** (`/app/frontend`): React 19 + Tailwind + Shadcn + Recharts + `lightweight-charts` + `@phosphor-icons/react` + Sonner.
- DB collections: `users`, `wallets`, `sessions`, `kyc_requests`, `deposits`, `withdrawals`, `orders`, `transactions`, `watchlist`, `notifications`, `bank_refs`, `login_history`, `login_attempts`, `cost_basis`, `system_settings`.

## Implemented (2026-04-20)
### Auth & profile
- Email/password register → auto-login, verification code emailed (or logged)
- `/auth/verify-email`, `/auth/resend-code`, brute-force lockout, login history
- Emergent Google Auth callback → session cookie
- Admin seeding at startup

### Wallet & accounting
- TRY + 15 crypto balances (locked/available), live TRY valuation
- Cost-basis tracked per buy/sell; P/L on dashboard & wallet
- Transaction log (deposits/withdrawals/trades)

### TRY deposit (IBAN)
- Per-user persistent reference code
- Bank info page (IBAN, bank, recipient, ref) with copy buttons
- Multipart upload of dekont to object storage
- Admin pending-queue + approve/reject (balance credited on approve)

### Withdrawal
- TR IBAN validation (TR prefix + 26 chars)
- TRY locked on request; refunded on rejection; released on approval
- Admin pending-queue

### Trading
- Binance-sourced TRY prices for BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOGE, AVAX, TRX, LINK, DOT, MATIC, LTC, SHIB
- Live candlestick chart (5m/15m/1h/4h/1d) via lightweight-charts
- Order book (bids/asks) + recent trades from Binance depth/trades
- Market buy (by TRY amount) / market sell / limit orders (funds locked)
- Open orders list + cancel
- 0.1% trading fee (configurable)

### KYC
- ID front + back + selfie upload with TC kimlik + full name + birth
- Status: none / pending / approved / rejected (with admin note)
- Enforced-or-not based on platform setting

### Admin panel (protected by role)
- Overview analytics (users, KYC pending, deposits pending, 24h volume)
- Users list
- KYC queue with approve/reject + note
- Deposits & withdrawals approval queues
- **Settings**: KYC enforcement toggle, trading fee, min deposit/withdraw

### UX polish
- Dark navy-black (#070A0F) + gold (#DCA335) theme
- Outfit / IBM Plex Sans / JetBrains Mono fonts
- Sidebar nav (desktop) + top glass navbar with notifications
- Sonner dark toasts, tabular-nums for all prices
- Landing page + Login + Register + VerifyEmail + AuthCallback

## Deferred (P1/P2)
- WebSocket live-tick streaming (currently 5-10s polling)
- Limit-order matching engine (currently funds locked; execution pending)
- Real 2FA (user removed)
- Multi-language (infrastructure left ready via i18n later)
- Referral reward automation beyond simple +10 TRY
- Price alerts / live support chat

## Test credentials
- Admin: `admin@coinberx.com` / `Admin123!`
- Regular users created via Register page (verification code in backend logs)
