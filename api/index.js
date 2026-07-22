// Serverless function to serve the viewer page (index.html)
// This bypasses Vercel's static file deployment issue
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'viewer.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('Error serving viewer page:', err);
    res.status(500).json({ success: false, error: 'Failed to load viewer page' });
  }
};
// Force redeploy - Wed, Jul 22, 2026  7:01:18 PM
