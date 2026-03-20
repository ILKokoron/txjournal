// pages/api/shelby/fetch.js
// GET /v1/blobs/{account}/{blobName}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet, blobName } = req.query;
  if (!wallet || !blobName) return res.status(400).json({ error: 'Missing wallet or blobName' });

  const baseUrl = process.env.SHELBY_API_URL || 'https://api.shelbynet.shelby.xyz/shelby';

  try {
    const response = await fetch(
      `${baseUrl}/v1/blobs/${encodeURIComponent(wallet)}/journal/${blobName}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: `Shelby error ${response.status}` });
    }

    const buf = await response.arrayBuffer();
    const text = Buffer.from(buf).toString('utf-8');
    const data = JSON.parse(text);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('Shelby fetch error:', e);
    return res.status(500).json({ error: 'Fetch failed', detail: e.message });
  }
}
