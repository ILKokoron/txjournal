// components/ShelbySync.jsx
import { useState } from 'react';
import s from './ShelbySync.module.css';

export default function ShelbySync({ trades, onRestore, connected, account, syncing, status, clearStatus, syncToShelby, loadFromShelby, loadBlob }) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSync = async () => {
    if (!connected) return;
    await syncToShelby(trades, account.address);
  };

  const handleLoad = async () => {
    if (!connected) return;
    const result = await loadFromShelby(account.address);
    if (result) {
      onRestore(result.trades);
      setHistory(result.index?.history || []);
      setShowHistory(true);
    }
  };

  const handleLoadBlob = async (blobName) => {
    if (!connected) return;
    const restored = await loadBlob(account.address, blobName);
    if (restored) onRestore(restored);
  };

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <div className={s.termDots}>
          <span className={s.dot} style={{background:'#ff3366'}}/>
          <span className={s.dot} style={{background:'#ffd166'}}/>
          <span className={s.dot} style={{background:'#00ff88'}}/>
        </div>
        <span className={s.title}>shelby_sync<span className="blink">_</span></span>
        {!connected && <span className={s.hint}>wallet required</span>}
      </div>

      <div className={s.body}>
        <div className={s.btns}>
          <button className={s.uploadBtn} onClick={handleSync}
            disabled={!connected || syncing || !trades.length}
            title={!connected?'Connect Petra first':undefined}>
            {syncing ? <><span className={s.spin}>◌</span> syncing...</> : '↑ sync to shelby'}
          </button>
          <button className={s.restoreBtn} onClick={handleLoad}
            disabled={!connected || syncing}>
            ↓ load latest
          </button>
        </div>

        {status && (
          <div className={`${s.statusBar} ${status.type==='success'?s.ok:status.type==='error'?s.err:s.info}`}>
            <span>{status.type==='success'?'✓':status.type==='error'?'✕':'◌'} {status.msg}</span>
            <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
              {status.explorerUrl && (
                <a href={status.explorerUrl} target="_blank" rel="noopener noreferrer" className={s.explorerLink}>
                  explorer ↗
                </a>
              )}
              <button className={s.dismissBtn} onClick={clearStatus}>×</button>
            </div>
          </div>
        )}

        {showHistory && history.length > 0 && (
          <div className={s.historyPanel}>
            <div className={s.histTitle}>&gt; backup history</div>
            {history.map((h, i) => (
              <div key={h.blobName} className={s.histItem}>
                <div>
                  <div className={s.histName}>{h.blobName}</div>
                  <div className={s.histMeta}>{h.count} trades · {new Date(h.uploadedAt).toLocaleDateString()}</div>
                </div>
                {i > 0 && (
                  <button className={s.loadBtn} onClick={() => handleLoadBlob(h.blobName)}>
                    restore
                  </button>
                )}
                {i === 0 && <span className={s.latestBadge}>latest</span>}
              </div>
            ))}
          </div>
        )}

        <div className={s.info}>
          <span className={s.infoLabel}>&gt; how it works</span>
          <span>trades → shelby blob (immutable)</span>
          <span>index.json → always updated</span>
          <span>linked to your petra wallet</span>
          <a href="https://explorer.shelby.xyz/testnet" target="_blank" rel="noopener noreferrer">
            explorer.shelby.xyz ↗
          </a>
        </div>
      </div>
    </div>
  );
}
