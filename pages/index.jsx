// pages/index.jsx
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useShelby } from '../lib/useShelby';
import { calcStats, generateId } from '../lib/tradeUtils';
import TradeForm from '../components/TradeForm';
import TradeTable from '../components/TradeTable';
import ShelbySync from '../components/ShelbySync';
import s from '../styles/Home.module.css';

// Chart.js — client only
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });
const Bar  = dynamic(() => import('react-chartjs-2').then(m => m.Bar),  { ssr: false });

const LOCAL_KEY = 'tx_journal_trades_v2';

function loadLocal() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

export default function Home() {
  const [trades, setTrades]       = useState([]);
  const [editTrade, setEditTrade] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [filter, setFilter]       = useState('all');
  const [view, setView]           = useState('dashboard'); // dashboard | trades | watchlist
  const [chartReady, setChartReady] = useState(false);

  const { account, connected, isLoading: connecting, connect, disconnect, wallet: walletInfo } = useWallet();
const wallet = {
  account,
  connected,
  connecting,
  connect: () => connect('Petra'),
  disconnect,
  shortAddress: account?.address ? `${account.address.toString().slice(0,6)}...${account.address.toString().slice(-4)}` : null,
  error: null,
};
  const shelby  = useShelby();

  // register Chart.js on client
  useEffect(() => {
    import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler }) => {
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);
      setChartReady(true);
    });
  }, []);

  useEffect(() => {
    setTrades(loadLocal());
  }, []);

  const save = useCallback((next) => {
    setTrades(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  }, []);

  const handleSaveTrade = (trade) => {
    const next = editTrade
      ? trades.map(t => t.id === trade.id ? trade : t)
      : [trade, ...trades];
    save(next);
    setEditTrade(null);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this trade?')) return;
    save(trades.filter(t => t.id !== id));
  };

  const handleEdit = (trade) => {
    setEditTrade(trade);
    setShowForm(true);
    setView('trades');
  };

  const handleRestore = (restored) => {
    save(restored);
  };

  const filtered = trades.filter(t =>
    filter === 'all' ? true : t.status === filter
  );

  const stats = calcStats(trades);

  const lineData = {
    labels: stats.cumulativePnL.map(d => d.date),
    datasets: [{
      data: stats.cumulativePnL.map(d => d.value),
      borderColor: '#00ff88',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      backgroundColor: 'rgba(0,255,136,0.05)',
      tension: 0.4,
    }],
  };

  const barData = {
    labels: stats.dailyPnL.map(([d]) => d),
    datasets: [{
      data: stats.dailyPnL.map(([,v]) => v),
      backgroundColor: stats.dailyPnL.map(([,v]) => v >= 0 ? 'rgba(0,255,136,0.65)' : 'rgba(255,51,102,0.65)'),
      borderColor: stats.dailyPnL.map(([,v]) => v >= 0 ? '#00ff88' : '#ff3366'),
      borderWidth: 1,
      borderRadius: 0,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#12121a', titleColor: '#6b7280', bodyColor: '#00ff88',
      borderColor: '#2a2a3a', borderWidth: 1,
      titleFont: { family: 'JetBrains Mono', size: 9 },
      bodyFont: { family: 'Orbitron', size: 11 },
    }},
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, border: { color: '#2a2a3a' } },
      y: { grid: { color: 'rgba(42,42,58,0.8)' }, ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 9 }, callback: v => '$'+v }, border: { color: '#2a2a3a' } },
    },
  };

  const barOpts = { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => (v >= 0 ? '+' : '') + v } } } };

  return (
    <>
      <Head>
        <title>TxJournal // Trade Log</title>
        <meta name="description" content="Decentralized trade journal on Shelby Protocol" />
      </Head>

      <div className={s.app}>
        {/* ── Sidebar ── */}
        <aside className={s.sidebar}>
          <div className={s.sbLogo}>
            <div className={s.sbIcon}>SJ</div>
            <span className={s.sbName}>SHELBY<span className="blink">_</span></span>
          </div>

          <div className={s.sbPortfolio}>
            <div className={s.sbPortLabel}>&gt; portfolio</div>
            <div className={s.sbPortVal}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString()}
            </div>
          </div>

          <nav className={s.sbNav}>
            <div className={s.sbSection}>// nav</div>
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'trades',    label: 'Finished Trades' },
              { key: 'add',       label: 'Add Trade' },
              { key: 'sync',      label: 'Shelby Sync' },
            ].map(item => (
              <div key={item.key}
                className={`${s.sbItem} ${view === item.key ? s.sbOn : ''}`}
                onClick={() => {
                  if (item.key === 'add') { setShowForm(true); setEditTrade(null); setView('trades'); }
                  else setView(item.key);
                }}>
                <span className={s.sbPrefix}>&gt;</span>
                {item.label}
              </div>
            ))}
          </nav>

          <div className={s.sbBottom}>
            {wallet.connected ? (
              <div className={s.sbUser}>
                <div className={s.sbAvatar}>
                  {wallet.shortAddress?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className={s.sbEmail}>{wallet.shortAddress}</div>
                  <div className={s.sbPlan}>Shelby Builder</div>
                </div>
                <button className={s.disconnectBtn} onClick={wallet.disconnect} title="Disconnect">✕</button>
              </div>
            ) : (
              <button className={s.connectBtn} onClick={wallet.connect} disabled={wallet.connecting}>
                {wallet.connecting ? '◌ connecting...' : '[ connect petra ]'}
              </button>
            )}
            {wallet.error && <div className={s.walletErr}>{wallet.error}</div>}
          </div>
        </aside>

        {/* ── Main ── */}
        <div className={s.main}>
          <header className={s.topbar}>
            <div className={s.tabNav}>
              {[
                { key: 'dashboard', label: 'Overview' },
                { key: 'trades',    label: 'Analytics' },
              ].map(t => (
                <button key={t.key}
                  className={`${s.tab} ${view === t.key || (view === 'add' && t.key === 'trades') ? s.tabOn : ''}`}
                  onClick={() => setView(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className={s.topRight}>
              <div className={s.statPill}>
                <span className={s.pillDot} style={{ background: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}/>
                {stats.winRate}% win rate
              </div>
              <div className={s.statPill}>{stats.totalTrades} trades</div>
            </div>
          </header>

          <div className={s.content}>

            {/* ── DASHBOARD VIEW ── */}
            {view === 'dashboard' && (
              <div className={s.fadeIn}>
                {/* Stat cards */}
                <div className={s.statRow}>
                  <StatCard label="Realized P&L" val={`${stats.totalPnL>=0?'+':''}$${stats.totalPnL}`} color={stats.totalPnL>=0?'var(--green)':'var(--red)'} glow={stats.totalPnL>=0?'var(--glow-g)':'var(--glow-r)'}/>
                  <StatCard label="Win Rate" val={`${stats.winRate}%`}
                    sub={`${stats.wins}W · ${stats.losses}L`}
                    color={stats.winRate>=50?'var(--green)':'var(--yellow)'}
                    donut={{ wins: stats.wins, losses: stats.losses }}/>
                  <StatCard label="Avg R:R" val={stats.avgRR ? `1:${stats.avgRR}` : '—'} color="var(--cyan)" glow="var(--glow-c)"/>
                  <StatCard label="Balance" val={`$${(14721.59 + stats.totalPnL).toLocaleString()}`} sub="5 portfolios" color="var(--fg)"/>
                </div>

                {/* Charts */}
                <div className={s.chartRow}>
                  <div className={s.chartCard}>
                    <div className={s.chartHeader}>
                      <div>
                        <div className={s.chartSub}>// cumulative</div>
                        <div className={s.chartTitle}>Finished Trades P&L</div>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 150 }}>
                      {chartReady && stats.cumulativePnL.length > 0
                        ? <Line data={lineData} options={chartOpts}/>
                        : <div className={s.noData}>no closed trades yet</div>}
                    </div>
                  </div>
                  <div className={s.chartCard}>
                    <div className={s.chartHeader}>
                      <div>
                        <div className={s.chartSub}>// per session</div>
                        <div className={s.chartTitle}>Daily P&L</div>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 150 }}>
                      {chartReady && stats.dailyPnL.length > 0
                        ? <Bar data={barData} options={barOpts}/>
                        : <div className={s.noData}>no closed trades yet</div>}
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div className={s.miniRow}>
                  <MiniStat label="Max Drawdown" val={`$${stats.maxDD}`} color="var(--red)"/>
                  <MiniStat label="Max Runup"    val={`+$${stats.maxRU}`} color="var(--green)" glow="var(--glow-g)"/>
                  <MiniStat label="Win Streak"   val={`${stats.winStreak}x`} color="var(--green)" glow="var(--glow-g)"/>
                  <MiniStat label="Loss Streak"  val={`${stats.lossStreak}x`} color={stats.lossStreak>=3?'var(--red)':'var(--dim)'}/>
                </div>

                {/* Recent trades */}
                {trades.length > 0 && (
                  <div className={s.recentWrap}>
                    <div className={s.recentHeader}>
                      <div className={s.termDots}>
                        <span style={{width:8,height:8,background:'#ff3366',clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',display:'inline-block'}}/>
                        <span style={{width:8,height:8,background:'#ffd166',clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',display:'inline-block'}}/>
                        <span style={{width:8,height:8,background:'#00ff88',clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)',display:'inline-block'}}/>
                      </div>
                      <span className={s.recentTitle}>recently_closed<span className="blink">_</span></span>
                    </div>
                    {trades.filter(t => t.status === 'closed').slice(0, 5).map(t => (
                      <div key={t.id} className={s.recentItem}>
                        <div className={s.recentIcon}>{t.pair?.slice(0,3) || '???'}</div>
                        <div className={s.recentInfo}>
                          <div className={s.recentPair}>{t.pair}</div>
                          <div className={s.recentSide}>{t.direction} · {t.strategy || 'manual'}</div>
                        </div>
                        <div className={s.recentRight}>
                          <div className={s.recentDate}>{t.date}</div>
                          <div className={`${s.recentPnl} ${t.pnl>=0?s.pos:s.neg}`}>
                            {t.pnl!==null&&t.pnl!==undefined ? `$${t.pnl>=0?'+':''}${t.pnl}` : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Shelby sync on dashboard */}
                <ShelbySync
                  trades={trades}
                  onRestore={handleRestore}
                  connected={wallet.connected}
                  account={wallet.account}
                  {...shelby}
                />
              </div>
            )}

            {/* ── TRADES VIEW ── */}
            {(view === 'trades' || view === 'add') && (
              <div className={s.fadeIn}>
                {showForm || editTrade ? (
                  <div style={{ marginBottom: 16 }}>
                    <TradeForm
                      onSave={handleSaveTrade}
                      onCancel={() => { setShowForm(false); setEditTrade(null); }}
                      editTrade={editTrade}
                    />
                  </div>
                ) : (
                  <button className={s.addBtn} onClick={() => { setShowForm(true); setEditTrade(null); }}>
                    <span>+</span> new_trade_entry<span className="blink">_</span>
                  </button>
                )}

                <div className={s.tableHeader}>
                  <span className={s.tableTitle}>
                    trade_log <span className={s.tableCount}>[{filtered.length}]</span>
                  </span>
                  <div className={s.filterGroup}>
                    {['all','open','closed'].map(f => (
                      <button key={f}
                        className={`${s.filterBtn} ${filter === f ? s.filterOn : ''}`}
                        onClick={() => setFilter(f)}>{f}</button>
                    ))}
                  </div>
                </div>

                <TradeTable trades={filtered} onEdit={handleEdit} onDelete={handleDelete}/>
              </div>
            )}

            {/* ── SYNC VIEW ── */}
            {view === 'sync' && (
              <div className={s.fadeIn}>
                <ShelbySync
                  trades={trades}
                  onRestore={handleRestore}
                  connected={wallet.connected}
                  account={wallet.account}
                  {...shelby}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, val, sub, color, glow, donut }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      clipPath: 'var(--chamfer-md)', padding: '16px 18px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div>
        <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 8 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color, textShadow: glow || 'none', lineHeight: 1 }}>{val}</div>
        {sub && <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 5, letterSpacing: '0.1em' }}>{sub}</div>}
      </div>
      {donut && (
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r="16" fill="none" stroke="#2a2a3a" strokeWidth="4"/>
          {(donut.wins + donut.losses) > 0 && <>
            <circle cx="23" cy="23" r="16" fill="none" stroke="#00ff88" strokeWidth="4"
              strokeDasharray={`${(donut.wins/(donut.wins+donut.losses))*100.5} 100.5`}
              strokeDashoffset="25.1" strokeLinecap="square"
              style={{ filter: 'drop-shadow(0 0 3px #00ff88)' }}/>
            <circle cx="23" cy="23" r="16" fill="none" stroke="#ff3366" strokeWidth="4"
              strokeDasharray={`${(donut.losses/(donut.wins+donut.losses))*100.5} 100.5`}
              strokeDashoffset={`${-(donut.wins/(donut.wins+donut.losses))*100.5 + 25.1}`}
              strokeLinecap="square"/>
          </>}
        </svg>
      )}
    </div>
  );
}

function MiniStat({ label, val, color, glow }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      clipPath: 'var(--chamfer-sm)', padding: '14px 16px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>&gt; {label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color, textShadow: glow || 'none' }}>{val}</div>
    </div>
  );
}
