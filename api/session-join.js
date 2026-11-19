'use strict'

const { readJson, sendJson, methodNotAllowed } = require('../server-lib/http')

// The browser cannot call sessionserver.mojang.com directly because of CORS.
// minecraft-protocol points its yggdrasil session server at this endpoint.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res)
  try {
    const body = await readJson(req)
    const upstream = await fetch('https://sessionserver.mojang.com/session/minecraft/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (upstream.status === 204) {
      res.statusCode = 204
      res.end()
      return
    }
    sendJson(res, upstream.status, { error: (await upstream.text()).slice(0, 500) })
  } catch (e) {
    sendJson(res, 502, { error: e.message })
  }
}
