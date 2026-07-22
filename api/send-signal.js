const { Redis } = require('@upstash/redis');
require('dotenv').config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'mock-url',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock-token',
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // We expect body parsing to be handled by Vercel functions, but just in case, read req.body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    
    const { roomId, senderType, sdp, candidate } = body || {};

    if (!roomId || !senderType) {
      return res.status(400).json({ success: false, error: 'roomId and senderType are required' });
    }

    const stateStr = await redis.get(roomId);
    if (!stateStr) {
      return res.status(404).json({ success: false, error: 'Room not found or expired' });
    }

    let roomState = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;

    if (sdp) {
      if (senderType === 'broadcaster') {
        roomState.broadcasterSdp = sdp;
      } else if (senderType === 'viewer') {
        roomState.viewerSdp = sdp;
      }
    }

    if (candidate) {
      roomState.iceCandidates = roomState.iceCandidates || [];
      // To differentiate who sent the candidate
      roomState.iceCandidates.push({
        senderType,
        candidate
      });
    }

    // Keep the TTL when updating the state
    await redis.set(roomId, JSON.stringify(roomState), { ex: 86400 });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending signal:', error);
    return res.status(500).json({ success: false, error: 'Failed to send signal' });
  }
};
