'use strict'

const { pollDeviceCode } = require('../../server-lib/auth')
const { readJson, sendJson, methodNotAllowed } = require('../../server-lib/http')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res)
  try {
    const { deviceCode } = await readJson(req)
    const result = await pollDeviceCode(deviceCode)
    sendJson(res, 200, result)
  } catch (e) {
    sendJson(res, 400, { error: e.message })
  }
}
