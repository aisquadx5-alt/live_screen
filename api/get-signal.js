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
    const { roomId, requesterType } = req.query;

    if (!roomId || !requesterType) {
      return res.status(400).json({ success: false, error: 'roomId and requesterType are required' });
    }

    const stateStr = await redis.get(roomId);
    if (!stateStr) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const roomState = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
    
    // Return opposite party's SDP
    let sdp = null;
    if (requesterType === 'broadcaster') {
      sdp = roomState.viewerSdp;
    } else if (requesterType === 'viewer') {
      sdp = roomState.broadcasterSdp;
    }

    // Return target ICE candidates sent by the OTHER party
    const targetCandidates = (roomState.iceCandidates || []).filter(c => c.senderType !== requesterType);

    return res.status(200).json({ 
      success: true, 
      sdp, 
      iceCandidates: targetCandidates.map(c => c.candidate)
    });
  } catch (error) {
    console.error('Error getting signal:', error);
    return res.status(500).json({ success: false, error: 'Failed to get signal' });
  }
};
