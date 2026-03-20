// lib/useWallet.js
// AIP-62 Wallet Standard — no window.aptos, no window.petra

import { useState, useEffect, useCallback } from 'react';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { getWallets } = await import('@wallet-standard/app');
      const wallets = getWallets().get();

      // wait a tick for wallets to register
      await new Promise(r => setTimeout(r, 300));
      const wallets2 = getWallets().get();
      const all = wallets2.length > wallets.length ? wallets2 : wallets;

      const petra = all.find(w => w.name === 'Petra');
      if (!petra) throw new Error('Petra not found. Make sure it is installed and unlocked.');

      const connectFeature = petra.features['aptos:connect'];
      if (!connectFeature) throw new Error('aptos:connect not supported by this wallet version.');

      const result = await connectFeature.connect();
      console.log('[TxJournal] connect result:', JSON.stringify(result, null, 2));

      const address = result?.args?.address?.toString() 
  || extractAddress(result?.accounts?.[0] ?? result);
      if (!address) throw new Error('Could not extract address. Check console for raw result.');

      setAccount({ address });
      setConnected(true);
      localStorage.setItem('tx_journal_addr', address);
    } catch (e) {
      console.error('[TxJournal] connect error:', e);
      setError(e.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { getWallets } = await import('@wallet-standard/app');
      const wallets = getWallets().get();
      const petra = wallets.find(w => w.name === 'Petra');
      const disconnectFeature = petra?.features['aptos:disconnect'];
      if (disconnectFeature) await disconnectFeature.disconnect();
    } catch (_) {}
    setAccount(null);
    setConnected(false);
    localStorage.removeItem('tx_journal_addr');
  }, []);

  // Auto-reconnect
  useEffect(() => {
    const saved = localStorage.getItem('tx_journal_addr');
    if (!saved) return;
    // try silent reconnect
    import('@wallet-standard/app').then(({ getWallets }) => {
      setTimeout(() => {
        const wallets = getWallets().get();
        const petra = wallets.find(w => w.name === 'Petra');
        const accountFeature = petra?.features['aptos:account'];
        if (accountFeature) {
          accountFeature.account().then(acc => {
            const address = extractAddress(acc);
            if (address) {
              setAccount({ address });
              setConnected(true);
            }
          }).catch(() => {});
        }
      }, 500);
    }).catch(() => {});
  }, []);

  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : null;

  return { account, connected, connecting, error, connect, disconnect, shortAddress };
}

// Extract hex address from any format Petra might return
function extractAddress(acc) {
  if (!acc) return null;

  // Format A: address.toString() returns 0x...
  if (acc.address && typeof acc.address.toString === 'function') {
    const s = acc.address.toString();
    if (s.startsWith('0x') && s.length >= 10) return s;
  }

  // Format B: address is plain string
  if (typeof acc.address === 'string' && acc.address.startsWith('0x')) {
    return acc.address;
  }

  // Format C: address.data is byte array
  const data = acc?.address?.data;
  if (data) {
    const bytes = data instanceof Uint8Array ? Array.from(data) : Object.values(data);
    return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Format D: hexString
  if (acc?.address?.hexString) return acc.address.hexString;

  // Format E: search raw JSON
  try {
    const raw = JSON.stringify(acc);
    const match = raw.match(/"(0x[a-fA-F0-9]{40,64})"/);
    if (match) return match[1];
  } catch (_) {}

  return null;
}
