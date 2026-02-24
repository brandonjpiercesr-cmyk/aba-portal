/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CCWA Router Passthrough - Vercel API Route
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 2.2 - UNICORN ROADMAP v1.2
 * 
 * This Vercel API route passes all requests through to REACH router.
 * Deploy this in your CCWA Vercel project at: /api/router.js
 * 
 * Usage: POST https://your-ccwa.vercel.app/api/router
 * Body: { message: "...", user_id: "...", trust_level: 10 }
 * 
 * ⬡B:CCWA:ROUTER.PASSTHROUGH:v1.0.0:20260224⬡
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Next.js API Route - /api/router.js

const REACH_URL = 'https://aba-reach.onrender.com';

export default async function handler(req, res) {
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    
    // Validate required fields
    if (!body.message) {
      return res.status(400).json({ error: 'message required' });
    }

    // Add vessel identifier
    const enrichedBody = {
      ...body,
      vessel: body.vessel || 'CCWA',
      timestamp: new Date().toISOString(),
      passthrough: true
    };

    // Forward to REACH router
    const reachResponse = await fetch(`${REACH_URL}/api/router`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enrichedBody)
    });

    const data = await reachResponse.json();

    // Add CCWA wrapper to response
    return res.status(200).json({
      ...data,
      ccwa_passthrough: true,
      reach_status: reachResponse.status
    });

  } catch (error) {
    console.error('[CCWA Passthrough] Error:', error);
    return res.status(500).json({
      error: 'CCWA passthrough failed',
      message: error.message,
      reach_url: REACH_URL
    });
  }
}
