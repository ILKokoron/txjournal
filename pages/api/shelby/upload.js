// pages/api/shelby/upload.js
// PUT /v1/blobs/{account}/{blobName}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, blobName, data } = req.body;
  if (!walletAddress || !blobName || !data) {
    return res.status(400).json({ error: 'Missing walletAddress, blobName, or data' });
  }

  const baseUrl = process.env.SHELBY_API_URL || 'https://api.shelbynet.shelby.xyz/shelby';
  const body = Buffer.from(JSON.stringify(data), 'utf-8');

  try {
    const response = await fetch(
      `${baseUrl}/v1/blobs/${encodeURIComponent(walletAddress)}/journal/${blobName}`,
      {
        method: 'PUT',
        headers: {
          'Content-Length': String(body.length),
          'Content-Type': 'application/json',
        },
        body,
      }
    );

    if (response.status === 204 || response.ok) {
      return res.status(200).json({ success: true, blobName });
    }

    const text = await response.text();
    return res.status(response.status).json({ error: `Shelby error ${response.status}`, detail: text });
  } catch (e) {
    console.error('Shelby upload error:', e);
    return res.status(500).json({ error: 'Upload failed', detail: e.message });
  }
}
