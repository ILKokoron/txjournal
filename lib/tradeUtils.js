// lib/tradeUtils.js

export const STRATEGIES = ['Breakout','Reversal','Trend Follow','Scalp','Range','News Play','DCA','Other'];
export const MARKETS = ['Crypto Perp','Crypto Spot','Forex','Stocks','Options','Other'];
export const DIRECTIONS = ['LONG','SHORT'];

export function generateId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

export function calcPnL(entry, exit, size, direction, fees = 0) {
  if (!entry || !exit || !size) return null;
  const diff = direction === 'SHORT' ? entry - exit : exit - entry;
  return parseFloat(((diff * size) - fees).toFixed(2));
}

export function calcRR(entry, sl, tp, direction) {
  if (!entry || !sl || !tp) return null;
  const risk = Math.abs(direction === 'SHORT' ? entry - sl : sl - entry);
  const reward = Math.abs(direction === 'SHORT' ? entry - tp : tp - entry);
  if (risk <= 0 || reward <= 0) return null;
  return parseFloat((reward / risk).toFixed(2));
}

export function calcStats(trades) {
  const closed = trades.filter(t => t.status === 'closed' && t.pnl !== null && t.pnl !== undefined);
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const totalPnL = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const rrs = closed.filter(t => t.rr).map(t => t.rr);
  const avgRR = rrs.length ? rrs.reduce((a,b) => a+b, 0) / rrs.length : null;

  let winStreak = 0, lossStreak = 0, cw = 0, cl = 0;
  for (const t of [...closed].reverse()) {
    if (t.pnl > 0) { cw++; cl = 0; } else { cl++; cw = 0; }
    winStreak = Math.max(winStreak, cw);
    lossStreak = Math.max(lossStreak, cl);
  }

  const maxDD = closed.length ? Math.min(...closed.map(t => t.pnl)) : 0;
  const maxRU = closed.length ? Math.max(...closed.map(t => t.pnl)) : 0;

  // daily pnl for chart
  const dailyMap = {};
  for (const t of closed) {
    if (!t.date) continue;
    dailyMap[t.date] = (dailyMap[t.date] || 0) + (t.pnl || 0);
  }
  const dailyPnL = Object.entries(dailyMap).sort(([a],[b]) => a.localeCompare(b));

  // cumulative pnl
  let cum = 0;
  const cumulativePnL = dailyPnL.map(([date, val]) => {
    cum += val;
    return { date, value: parseFloat(cum.toFixed(2)) };
  });

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : 0,
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    avgPnL: closed.length ? parseFloat((totalPnL / closed.length).toFixed(2)) : 0,
    maxDD,
    maxRU,
    avgRR: avgRR ? parseFloat(avgRR.toFixed(2)) : null,
    winStreak,
    lossStreak,
    wins: wins.length,
    losses: losses.length,
    dailyPnL,
    cumulativePnL,
  };
}
