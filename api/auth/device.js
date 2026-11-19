'use strict'

const { requestDeviceCode } = require('../../server-lib/auth')
const { sendJson, methodNotAllowed } = require('../../server-lib/http')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res)
  try {
    sendJson(res, 200, await requestDeviceCode())
  } catch (e) {
    sendJson(res, 502, { error: e.message })
  }
}
