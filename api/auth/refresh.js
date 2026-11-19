'use strict'

const { refreshSession } = require('../../server-lib/auth')
const { readJson, sendJson, methodNotAllowed } = require('../../server-lib/http')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res)
  try {
    const { refreshToken } = await readJson(req)
    sendJson(res, 200, { session: await refreshSession(refreshToken) })
  } catch (e) {
    sendJson(res, 401, { error: e.message, code: e.code })
  }
}
