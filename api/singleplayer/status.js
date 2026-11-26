'use strict'

const config = require('../../config.json')

// Vercel cannot keep a long-running flying-squid process. The browser embeds
// the world instead, using the lazily loaded singleplayer-server.js bundle.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    available: true,
    embedded: true,
    running: false,
    version: config.defaultSingleplayerVersion || '1.20.1'
  })
}
