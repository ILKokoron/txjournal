// pages/api/shelby/upload.js
// Uses @shelby-protocol/sdk — same as ModelVault

import { Network, Ed25519PrivateKey, Account, AccountAddress } from "@aptos-labs/ts-sdk";

const SHELBYNET_DEPLOYER = "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a";

let _shelbyClient = null;

async function getShelbyClient() {
  if (_shelbyClient) return _shelbyClient;

  const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
  const apiKey = process.env.SHELBY_API_KEY;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // patch fetch for file:// WASM urls (same as ModelVault)
  const _orig = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input
      : input instanceof URL ? input.toString()
      : input.url;
    if (url.startsWith("file://")) {
      const { readFileSync } = await import("fs");
      const buf = readFileSync(new URL(url).pathname);
      return new Response(buf);
    }
    if (url.includes("shelby.xyz")) {
      const h = new Headers(init?.headers ?? {});
      if (!h.has("Origin")) h.set("Origin", origin);
      init = { ...init, headers: h };
    }
    return _orig(input, init);
  };

  _shelbyClient = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    ...(apiKey ? { apiKey } : {}),
    deployer: AccountAddress.fromString(SHELBYNET_DEPLOYER),
  });

  return _shelbyClient;
}

function getPublisherSigner() {
  const rawKey = process.env.NEXT_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
  if (!rawKey) throw new Error("NEXT_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not set");
  const hexKey = rawKey.replace(/^ed25519-priv-/, "");
  const privateKey = new Ed25519PrivateKey(hexKey);
  return Account.fromPrivateKey({ privateKey });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { walletAddress, blobName, data } = req.body;
  if (!walletAddress || !blobName || !data) {
    return res.status(400).json({ error: "Missing walletAddress, blobName, or data" });
  }

  try {
    const shelby = await getShelbyClient();
    const signer = getPublisherSigner();

    const blobData = new TextEncoder().encode(JSON.stringify(data));
    const fullBlobPath = `journal/${blobName}`;

    // 5-year expiration
    const expirationMicros = Date.now() * 1000 + 5 * 365 * 24 * 60 * 60 * 1_000_000;

    await shelby.upload({
      blobData,
      signer,
      blobName: `${walletAddress}/${fullBlobPath}`,
      expirationMicros,
    });

    return res.status(200).json({ success: true, blobName });

  } catch (e) {
    console.error("[upload] error:", e);
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
}
