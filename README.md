# TxJournal

Decentralized trade journal built on **Shelby Protocol** and **Aptos** blockchain.

**Live:** https://txjournal.vercel.app

---

## What is TxJournal?

TxJournal is an on-chain trade journal for crypto traders. Every sync proves:

- **What you traded** — entry, exit, P&L, R:R, strategy, all recorded
- **When you traded** — immutable timestamp on Shelby blob storage
- **That it's yours** — cryptographic proof tied to your Aptos wallet address

No centralized server. No database. Your trade history lives on Shelby Protocol — permanent, verifiable, and owned by you.

---

## Features

- **Trade logging** — entry/exit price, direction (LONG/SHORT), strategy, size, fees, notes
- **Live P&L & R:R calculator** — auto-calculated as you type
- **Stats dashboard** — win rate, total P&L, max drawdown, win/loss streak, avg R:R
- **Cumulative & daily P&L charts** — visualize trading performance over time
- **Shelby sync** — backup all trades as an immutable blob on Shelby Protocol
- **On-chain registration** — every sync triggers `blob_metadata::register_multiple_blobs` on Aptos ShelbyNet
- **Wallet connect** — AIP-62 compatible (Petra and any standard Aptos wallet)
- **Local-first** — trades stored in localStorage, synced to Shelby on demand

---

## How it works

```
Connect Petra wallet
      ↓
Input trades → stored in localStorage (instant, offline-first)
      ↓
Click "Sync to Shelby"
      ↓
SDK generates blob commitments locally
      ↓
Wallet signs Aptos transaction → blob_metadata::register_multiple_blobs
      ↓
TX confirmed on ShelbyNet → trade data permanently stored
      ↓
View TX on Aptos Explorer (ShelbyNet)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18 |
| Styling | CSS Modules (custom cyberpunk design system) |
| Blockchain | Aptos (`@aptos-labs/ts-sdk`) |
| Storage | Shelby Protocol (`@shelby-protocol/sdk`, `@shelby-protocol/react`) |
| Wallet | `@aptos-labs/wallet-adapter-react` (AIP-62) |
| Charts | Chart.js + react-chartjs-2 |
| Network | ShelbyNet (Aptos-compatible) |
| Deploy | Vercel |

---

## Getting Started

```bash
git clone https://github.com/ILKokoron/txjournal
cd txjournal
npm install --legacy-peer-deps
npm run dev
```

Create `.env.local`:

```
NEXT_PUBLIC_SHELBY_API_KEY=aptoslabs_xxxxx
```

Get your API key at [geomi.dev](https://geomi.dev).

---

## Use Cases

- Crypto traders who want a permanent, verifiable trade history
- Traders who want proof of their track record on-chain
- DeFi users who want to journal trades across multiple protocols
- Anyone who wants their data owned by them, not a platform

---

## References

- [Shelby Docs](https://docs.shelby.xyz)
- [Shelby Explorer](https://explorer.shelby.xyz/shelbynet)
- [Aptos Explorer (ShelbyNet)](https://explorer.aptoslabs.com/?network=shelbynet)
- [Shelby Protocol](https://shelby.xyz)

---

## License

MIT
