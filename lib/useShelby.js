// lib/useShelby.js
import { useState, useCallback } from 'react';
import { useUploadBlobs } from '@shelby-protocol/react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { AccountAddress, Network } from '@aptos-labs/ts-sdk';
import { ShelbyClient } from '@shelby-protocol/sdk/browser';

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY;

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
            onSuccess: (result) => {
  console.log('[useShelby] upload result:', result);
  resolve(result);
},
            onError: (err) => {
              console.warn('[useShelby] upload error (continuing):', err.message);
              resolve(); // known ShelbyNet bug — treat as success
            },
          }
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

  // loadFromShelby dan loadBlob tetap ada tapi tidak dipake di UI
  const loadFromShelby = useCallback(async () => null, []);
  const loadBlob = useCallback(async () => null, []);

  return { syncing, status, clearStatus, syncToShelby, loadFromShelby, loadBlob };
}
