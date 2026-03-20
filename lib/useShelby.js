// lib/useShelby.js
// Blob naming strategy:
//   trades data : /journal/trades_{timestamp}.json  (immutable snapshots)
//   index       : /journal/index.json               (always overwritten = latest pointer)

import { useState, useCallback } from 'react';

export function useShelby() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', msg }

  const clearStatus = () => setStatus(null);

  // Upload trades JSON + update index blob
  const syncToShelby = useCallback(async (trades, walletAddress) => {
    setSyncing(true);
    setStatus({ type: 'info', msg: 'uploading trades...' });
    try {
      const timestamp = Date.now();
      const blobName = `trades_${timestamp}.json`;

      // 1. Upload trades snapshot
      const tradesRes = await fetch('/api/shelby/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          blobName,
          data: {
            version: '1.0',
            owner: walletAddress,
            exportedAt: new Date().toISOString(),
            trades,
          },
        }),
      });
      if (!tradesRes.ok) {
        const err = await tradesRes.json();
        throw new Error(err.error || 'Trades upload failed');
      }

      setStatus({ type: 'info', msg: 'updating index...' });

      // 2. Fetch existing index to preserve history
      let history = [];
      try {
        const idxRes = await fetch(`/api/shelby/fetch?wallet=${walletAddress}&blobName=index.json`);
        if (idxRes.ok) {
          const idxData = await idxRes.json();
          history = idxData?.data?.history || [];
        }
      } catch (_) {}

      // 3. Upload new index (overwrites previous index.json)
      const newIndex = {
        latest: blobName,
        updatedAt: new Date().toISOString(),
        owner: walletAddress,
        history: [{ blobName, uploadedAt: new Date().toISOString(), count: trades.length }, ...history].slice(0, 20),
      };

      const indexRes = await fetch('/api/shelby/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          blobName: 'index.json',
          data: newIndex,
        }),
      });
      if (!indexRes.ok) {
        const err = await indexRes.json();
        throw new Error(err.error || 'Index update failed');
      }

      setStatus({
        type: 'success',
        msg: `synced ${trades.length} trades ✓`,
        blobName,
        explorerUrl: `https://explorer.shelby.xyz/testnet`,
      });
      return blobName;
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  // Load latest trades from Shelby using wallet address
  const loadFromShelby = useCallback(async (walletAddress) => {
    setSyncing(true);
    setStatus({ type: 'info', msg: 'fetching index...' });
    try {
      // 1. Fetch index
      const idxRes = await fetch(`/api/shelby/fetch?wallet=${walletAddress}&blobName=index.json`);
      if (!idxRes.ok) throw new Error('No data found for this wallet');
      const idxData = await idxRes.json();
      const latestBlob = idxData?.data?.latest;
      if (!latestBlob) throw new Error('Index is empty');

      setStatus({ type: 'info', msg: `loading ${latestBlob}...` });

      // 2. Fetch latest trades blob
      const tradesRes = await fetch(`/api/shelby/fetch?wallet=${walletAddress}&blobName=${latestBlob}`);
      if (!tradesRes.ok) throw new Error('Failed to fetch trades blob');
      const tradesData = await tradesRes.json();
      const trades = tradesData?.data?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid data format');

      setStatus({ type: 'success', msg: `loaded ${trades.length} trades ✓` });
      return { trades, index: idxData.data };
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  // Load specific blob by name
  const loadBlob = useCallback(async (walletAddress, blobName) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/shelby/fetch?wallet=${walletAddress}&blobName=${encodeURIComponent(blobName)}`);
      if (!res.ok) throw new Error('Blob not found');
      const data = await res.json();
      const trades = data?.data?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid blob format');
      setStatus({ type: 'success', msg: `loaded ${trades.length} trades from ${blobName} ✓` });
      return trades;
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { syncing, status, clearStatus, syncToShelby, loadFromShelby, loadBlob };
}
