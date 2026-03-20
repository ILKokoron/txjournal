# TxJournal

Decentralized trade journal built on [Shelby Protocol](https://shelby.xyz).

## Stack
- **Next.js 14** (Pages Router)
- **Shelby Protocol** — blob storage via `api.shelbynet.shelby.xyz`
- **Petra Wallet** — AIP-62 connect
- **Chart.js** — P&L charts
- **No external UI libraries** — pure CSS modules, cyberpunk design system

## How data is stored

```
Petra wallet connect
      ↓
Upload trades JSON → PUT /v1/blobs/{wallet}/journal/trades_{ts}.json
      ↓
Update index      → PUT /v1/blobs/{wallet}/journal/index.json
      (always overwritten, contains pointer to latest blob + history)
      ↓
Restore → GET index.json → GET latest trades blob
```

Blob path = `{wallet_address}/journal/{filename}` — wallet address is the account identifier. No smart contract needed.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`.env.local` (optional — default URL already set):
```
SHELBY_API_URL=https://api.shelbynet.shelby.xyz/shelby
```

## Deploy to Vercel

```bash
vercel
```

No env vars required — Shelby API URL is hardcoded as default.

## Features

- Add / edit / delete trades
- Auto P&L + R:R calculation
- Cumulative P&L line chart
- Daily P&L bar chart  
- Stats: win rate, avg R:R, max drawdown, streaks
- Petra wallet connect (AIP-62)
- Sync all trades to Shelby blob
- Restore from latest blob by wallet address
- Backup history (last 20 snapshots)
