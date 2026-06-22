// File: /api/notify.js
// Deploy this inside a Vercel project at the path /api/notify.js
// It receives { email } from the Coming Soon page and forwards it to Airtable,
// keeping your Airtable Personal Access Token secret on the server side.

// Allowed origins — domains permitted to call this function from the browser.
const ALLOWED_ORIGINS = [
  'https://blkfamilyhealth.com',
  'https://www.blkfamilyhealth.com',
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  // Browsers send a pre-flight OPTIONS request before the real POST —
  // it must get a quick, empty 200 response or the real request never fires.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  // Basic validation
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  // These come from Vercel Environment Variables — never hardcoded here
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Coming Soon Signups';

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Email: email,
            'Date Added': new Date().toISOString(),
            Source: 'Coming Soon Page',
          },
        }),
      }
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      console.error('Airtable error:', errText);
      return res.status(502).json({ error: 'Could not save signup right now' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
