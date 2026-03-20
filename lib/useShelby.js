// lib/useShelby.js
// Client-side Shelby upload using @shelby-protocol/sdk/browser
// No server needed — runs directly in browser, WASM loads fine

import { useState, useCallback } from 'react';

export function useShelby() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);

  const clearStatus = () => setStatus(null);

  const syncToShelby = useCallback(async (trades, walletAddress) => {
    setSyncing(true);
    setStatus({ type: 'info', msg: 'initializing shelby client...' });
    try {
      // Dynamic import — browser SDK, WASM loads in browser context
      const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');
      const { Network } = await import('@aptos-labs/ts-sdk');

      const apiKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;

      const shelby = new ShelbyClient({
        network: Network.TESTNET,
        ...(apiKey ? { apiKey } : {}),
      });

      const ts = Date.now();
      const blobName = `${walletAddress}/journal/trades_${ts}.json`;
      const payload = {
        version: '1.0',
        owner: walletAddress,
        exportedAt: new Date().toISOString(),
        trades,
      };

      setStatus({ type: 'info', msg: 'uploading trades to shelby...' });

      const blobData = new TextEncoder().encode(JSON.stringify(payload));

      // Upload blob — this triggers wallet popup for signing
      await shelby.upload({
        blobData,
        blobName,
        expirationMicros: Date.now() * 1000 + 5 * 365 * 24 * 60 * 60 * 1_000_000,
      });

      // Update index
      setStatus({ type: 'info', msg: 'updating index...' });

      let history = [];
      try {
        const idxName = `${walletAddress}/journal/index.json`;
        const existing = await shelby.download({ blobName: idxName });
        if (existing) {
          const parsed = JSON.parse(new TextDecoder().decode(existing));
          history = parsed?.history || [];
        }
      } catch (_) {}

      const newIndex = {
        latest: `trades_${ts}.json`,
        updatedAt: new Date().toISOString(),
        owner: walletAddress,
        history: [
          { blobName: `trades_${ts}.json`, uploadedAt: new Date().toISOString(), count: trades.length },
          ...history,
        ].slice(0, 20),
      };

      await shelby.upload({
        blobData: new TextEncoder().encode(JSON.stringify(newIndex)),
        blobName: `${walletAddress}/journal/index.json`,
        expirationMicros: Date.now() * 1000 + 5 * 365 * 24 * 60 * 60 * 1_000_000,
      });

      setStatus({
        type: 'success',
        msg: `synced ${trades.length} trades ✓`,
        explorerUrl: 'https://explorer.shelby.xyz/testnet',
      });

      return `trades_${ts}.json`;
    } catch (e) {
      console.error('[useShelby] syncToShelby error:', e);
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const loadFromShelby = useCallback(async (walletAddress) => {
    setSyncing(true);
    setStatus({ type: 'info', msg: 'fetching index...' });
    try {
      const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');
      const { Network } = await import('@aptos-labs/ts-sdk');

      const apiKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
      const shelby = new ShelbyClient({
        network: Network.TESTNET,
        ...(apiKey ? { apiKey } : {}),
      });

      const idxData = await shelby.download({
        blobName: `${walletAddress}/journal/index.json`,
      });

      if (!idxData) throw new Error('No data found for this wallet');

      const idx = JSON.parse(new TextDecoder().decode(idxData));
      const latest = idx?.latest;
      if (!latest) throw new Error('Index is empty');

      setStatus({ type: 'info', msg: `loading ${latest}...` });

      const tradesData = await shelby.download({
        blobName: `${walletAddress}/journal/${latest}`,
      });

      if (!tradesData) throw new Error('Failed to fetch trades blob');

      const parsed = JSON.parse(new TextDecoder().decode(tradesData));
      const trades = parsed?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid data format');

      setStatus({ type: 'success', msg: `loaded ${trades.length} trades ✓` });
      return { trades, index: idx };
    } catch (e) {
      console.error('[useShelby] loadFromShelby error:', e);
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const loadBlob = useCallback(async (walletAddress, blobName) => {
    setSyncing(true);
    try {
      const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');
      const { Network } = await import('@aptos-labs/ts-sdk');

      const apiKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
      const shelby = new ShelbyClient({
        network: Network.TESTNET,
        ...(apiKey ? { apiKey } : {}),
      });

      const data = await shelby.download({
        blobName: `${walletAddress}/journal/${blobName}`,
      });

      if (!data) throw new Error('Blob not found');

      const parsed = JSON.parse(new TextDecoder().decode(data));
      const trades = parsed?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid format');

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
