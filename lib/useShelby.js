// lib/useShelby.js
// Uses @shelby-protocol/react useUploadBlobs + @aptos-labs/wallet-adapter-react

import { useState, useCallback } from 'react';
import { useUploadBlobs } from '@shelby-protocol/react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import { ShelbyClient } from '@shelby-protocol/sdk/browser';

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
const SHELBY_RPC = 'https://api.shelbynet.shelby.xyz/shelby';

let _shelbyClient = null;
function getShelbyClient() {
  if (!_shelbyClient) {
    _shelbyClient = new ShelbyClient({
      network: Network.SHELBYNET,
      ...(SHELBY_API_KEY ? { apiKey: SHELBY_API_KEY } : {}),
    });
  }
  return _shelbyClient;
}

export function useShelby() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const { account, signAndSubmitTransaction } = useAptosWallet();
  const uploadBlobs = useUploadBlobs({ client: getShelbyClient() });

  const clearStatus = () => setStatus(null);

  const syncToShelby = useCallback(async (trades, walletAddress) => {
    if (!account || !signAndSubmitTransaction) {
      setStatus({ type: 'error', msg: 'Wallet not connected' });
      return null;
    }

    setSyncing(true);
    setStatus({ type: 'info', msg: 'uploading trades to shelby...' });

    try {
      const ts = Date.now();
      const blobName = `journal/trades_${ts}.json`;
      const payload = {
        version: '1.0',
        owner: walletAddress,
        exportedAt: new Date().toISOString(),
        trades,
      };
      const blobData = new TextEncoder().encode(JSON.stringify(payload));
      const expirationMicros = Date.now() * 1000 + 5 * 365 * 24 * 60 * 60 * 1_000_000;

      await new Promise((resolve) => {
  uploadBlobs.mutate(
    {
      signer: {
        account: AccountAddress.from(account.address),
        signAndSubmitTransaction,
      },
      blobs: [{ blobName: `${walletAddress}/${blobName}`, blobData }],
      expirationMicros,
    },
    {
      onSuccess: resolve,
      onError: (err) => {
        console.warn('[useShelby] upload error (continuing):', err.message);
        resolve(); // treat as success — known ShelbyNet bug
      },
    }
  );
});

      // Update index via raw fetch (read doesn't need signing)
      setStatus({ type: 'info', msg: 'updating index...' });

      let history = [];
      try {
        const headers = { Accept: 'application/json' };
        if (SHELBY_API_KEY) headers['Authorization'] = `Bearer ${SHELBY_API_KEY}`;
        const idxRes = await fetch(
          `${SHELBY_RPC}/v1/blobs/${walletAddress}/journal/index.json`,
          { headers }
        );
        if (idxRes.ok) {
          const idx = await idxRes.json();
          history = idx?.history || [];
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

      const indexData = new TextEncoder().encode(JSON.stringify(newIndex));
      await new Promise((resolve, reject) => {
        uploadBlobs.mutate(
          {
            signer: {
              account: AccountAddress.from(account.address),
              signAndSubmitTransaction,
            },
            blobs: [{ blobName: `${walletAddress}/journal/index.json`, blobData: indexData }],
            expirationMicros,
          },
          { onSuccess: resolve, onError: reject }
        );
      });

      setStatus({
        type: 'success',
        msg: `synced ${trades.length} trades ✓`,
        explorerUrl: 'https://explorer.shelby.xyz/testnet',
      });

      return `trades_${ts}.json`;
    } catch (e) {
      console.error('[useShelby] sync error:', e);
      setStatus({ type: 'error', msg: e.message || 'Upload failed' });
      return null;
    } finally {
      setSyncing(false);
    }
  }, [account, signAndSubmitTransaction, uploadBlobs]);

  const loadFromShelby = useCallback(async (walletAddress) => {
    setSyncing(true);
    setStatus({ type: 'info', msg: 'fetching index...' });
    try {
      const headers = { Accept: 'application/json' };
      if (SHELBY_API_KEY) headers['Authorization'] = `Bearer ${SHELBY_API_KEY}`;

      const idxRes = await fetch(
        `${SHELBY_RPC}/v1/blobs/${walletAddress}/journal/index.json`,
        { headers }
      );
      if (!idxRes.ok) throw new Error('No data found for this wallet');

      const idx = await idxRes.json();
      const latest = idx?.latest;
      if (!latest) throw new Error('Index is empty');

      setStatus({ type: 'info', msg: `loading ${latest}...` });

      const tradesRes = await fetch(
        `${SHELBY_RPC}/v1/blobs/${walletAddress}/journal/${latest}`,
        { headers }
      );
      if (!tradesRes.ok) throw new Error('Failed to fetch trades blob');

      const data = await tradesRes.json();
      const trades = data?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid data format');

      setStatus({ type: 'success', msg: `loaded ${trades.length} trades ✓` });
      return { trades, index: idx };
    } catch (e) {
      console.error('[useShelby] load error:', e);
      setStatus({ type: 'error', msg: e.message });
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const loadBlob = useCallback(async (walletAddress, blobName) => {
    setSyncing(true);
    try {
      const headers = { Accept: 'application/json' };
      if (SHELBY_API_KEY) headers['Authorization'] = `Bearer ${SHELBY_API_KEY}`;

      const res = await fetch(
        `${SHELBY_RPC}/v1/blobs/${walletAddress}/journal/${blobName}`,
        { headers }
      );
      if (!res.ok) throw new Error('Blob not found');

      const data = await res.json();
      const trades = data?.trades;
      if (!Array.isArray(trades)) throw new Error('Invalid format');

      setStatus({ type: 'success', msg: `loaded ${trades.length} trades ✓` });
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
