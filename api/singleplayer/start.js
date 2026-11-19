'use strict'

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.status(409).json({
    error: 'Server-side worlds are not available on this deployment. Reload the page to use browser singleplayer.',
    embedded: true
  })
}
