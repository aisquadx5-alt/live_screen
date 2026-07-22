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
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomState = {
      broadcasterSdp: null,
      viewerSdp: null,
      iceCandidates: []
    };

    // Store in Upstash Redis with 24 hours (86400 seconds) expiration
    await redis.set(roomId, JSON.stringify(roomState), { ex: 86400 });

    return res.status(200).json({ success: true, roomId });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ success: false, error: 'Failed to create room' });
  }
};
