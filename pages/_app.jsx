// pages/_app.jsx
import '../styles/globals.css';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Network } from '@aptos-labs/ts-sdk';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{ network: Network.TESTNET }}
        onError={(error) => console.error('[WalletAdapter]', error)}
      >
        <Component {...pageProps} />
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}
