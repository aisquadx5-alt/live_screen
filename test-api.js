// Simple automated script to locally simulate endpoints without a real Redis connection
// We mock the @upstash/redis module
const mockRedisData = {};

jest = {
    mock: (moduleName, mockFunc) => {
        require('module')._cache[require.resolve(moduleName)] = {
            id: moduleName,
            filename: moduleName,
            loaded: true,
            exports: mockFunc()
        };
    }
};

jest.mock('@upstash/redis', () => {
    return {
        Redis: class {
            constructor() {}
            async get(key) {
                return mockRedisData[key] || null;
            }
            async set(key, value, options) {
                mockRedisData[key] = value;
                return 'OK';
            }
        }
    };
});

const createRoom = require('./api/create-room');
const sendSignal = require('./api/send-signal');
const getSignal = require('./api/get-signal');

// Helper to mock express Request and Response
const mockRes = () => {
    const res = {};
    res.headers = {};
    res.setHeader = (k, v) => res.headers[k] = v;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    res.end = () => { return res; };
    return res;
};

async function runTests() {
    console.log('--- Running API Tests ---');

    // 1. Create Room
    let res = mockRes();
    await createRoom({ method: 'POST' }, res);
    console.assert(res.statusCode === 200, 'Create room failed');
    console.assert(res.body.success === true, 'Create room not successful');
    const roomId = res.body.roomId;
    console.log('✓ Room created:', roomId);

    // 2. Broadcaster Sends Offer
    res = mockRes();
    const offerSdp = { type: 'offer', sdp: 'fake-sdp-offer' };
    await sendSignal({
        method: 'POST',
        body: { roomId, senderType: 'broadcaster', sdp: offerSdp }
    }, res);
    console.assert(res.statusCode === 200, 'Broadcaster send failed');
    console.log('✓ Broadcaster sent offer');

    // 3. Viewer Gets Offer
    res = mockRes();
    await getSignal({
        method: 'GET',
        query: { roomId, requesterType: 'viewer' }
    }, res);
    console.assert(res.statusCode === 200, 'Viewer get failed');
    console.assert(res.body.sdp.sdp === 'fake-sdp-offer', 'Viewer did not get correct offer');
    console.log('✓ Viewer received offer');

    // 4. Viewer Sends Answer & Candidate
    res = mockRes();
    const answerSdp = { type: 'answer', sdp: 'fake-sdp-answer' };
    await sendSignal({
        method: 'POST',
        body: { roomId, senderType: 'viewer', sdp: answerSdp, candidate: { candidate: 'candidate-1' } }
    }, res);
    console.assert(res.statusCode === 200, 'Viewer send failed');
    console.log('✓ Viewer sent answer and candidate');

    // 5. Broadcaster Gets Answer & Candidate
    res = mockRes();
    await getSignal({
        method: 'GET',
        query: { roomId, requesterType: 'broadcaster' }
    }, res);
    console.assert(res.statusCode === 200, 'Broadcaster get failed');
    console.assert(res.body.sdp.sdp === 'fake-sdp-answer', 'Broadcaster did not get correct answer');
    console.assert(res.body.iceCandidates[0].candidate === 'candidate-1', 'Broadcaster did not get ICE candidate');
    console.log('✓ Broadcaster received answer and candidate');

    console.log('--- All tests passed! ---');
}

runTests().catch(console.error);
