// lib/useWallet.js
// Uses window.aptos — same connect method as ShelbyVault, proven working with Petra

import { useState, useEffect, useCallback } from 'react';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const getProvider = () => {
    if (typeof window === 'undefined') return null;
    if (window.aptos) return window.aptos;
    if (window.nightly?.aptos) return window.nightly.aptos;
    return null;
  };

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const provider = getProvider();
      if (!provider) throw new Error('Petra wallet not found. Install from petra.app');

      // Exact same method as ShelbyVault — proven working
      const r = await provider.connect();
      const address = r?.address?.toString() || r?.address;
      if (!address) throw new Error('Could not get wallet address');

      setAccount({ address });
      setConnected(true);
      localStorage.setItem('tx_journal_addr', address);
    } catch (e) {
      setError(e.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try { await getProvider()?.disconnect?.(); } catch (_) {}
    setAccount(null);
    setConnected(false);
    localStorage.removeItem('tx_journal_addr');
  }, []);

  // Auto-reconnect on mount
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    provider.isConnected?.().then(yes => {
      if (yes) connect();
    }).catch(() => {});
  }, [connect]);

  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : null;

  return { account, connected, connecting, error, connect, disconnect, shortAddress };
}
