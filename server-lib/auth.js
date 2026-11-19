'use strict'

const { Authflow, Titles } = require('prismarine-auth')

// prismarine-auth uses the Nintendo Switch title for the live device-code flow
// when authenticating Java Edition. The legacy Java launcher id can obtain an
// MSA token but is rejected later by the Xbox title/XSTS exchange (403).
const CLIENT_ID = process.env.MSA_CLIENT_ID || Titles.MinecraftNintendoSwitch
const SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL'
const DEVICE_CODE_URL = 'https://login.live.com/oauth20_connect.srf'
const TOKEN_URL = 'https://login.live.com/oauth20_token.srf'

function memoryCache (seed = {}) {
  let cache = seed
  return {
    async getCached () { return cache },
    async setCached (data) { cache = data },
    async setCachedPartial (data) { cache = { ...cache, ...data } },
    async reset () { cache = {}; return cache }
  }
}

async function parseResponse (res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (e) {
    return { error: 'invalid_response', error_description: text.slice(0, 500) }
  }
}

async function requestDeviceCode () {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: SCOPE,
    response_type: 'device_code'
  })

  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  const data = await parseResponse(res)
  if (!res.ok || !data.device_code) {
    throw new Error(data.error_description || data.error || `Microsoft returned HTTP ${res.status}`)
  }

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval || 5,
    message: data.message || `Open ${data.verification_uri} and enter the code ${data.user_code}`
  }
}

async function requestToken (params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params })
  })
  const data = await parseResponse(res)
  return { ok: res.ok, status: res.status, data }
}

/**
 * Exchange a Microsoft live.com token (from device code or refresh) for a
 * Minecraft Java session. Runs entirely server side because the Xbox Live
 * token exchange needs request signing and is not CORS friendly.
 */
async function exchangeMinecraftSession (token) {
  const liveCache = memoryCache({
    token: {
      ...token,
      // prismarine-auth treats expires_in as milliseconds internally
      expires_in: (Number(token.expires_in) || 3600) * 1000,
      obtainedOn: Date.now()
    }
  })
  const caches = { live: liveCache }
  const cacheFactory = ({ cacheName }) => {
    if (!caches[cacheName]) caches[cacheName] = memoryCache()
    return caches[cacheName]
  }

  const flow = new Authflow('', cacheFactory, { flow: 'live', authTitle: CLIENT_ID, deviceType: 'Nintendo' })
  let result
  try {
    result = await flow.getMinecraftJavaToken({ fetchProfile: true })
  } catch (e) {
    const detail = e && e.message ? e.message : String(e)
    if (/^403\b/.test(detail)) {
      throw new Error('Xbox Live rejected the sign-in (403). Make sure this Microsoft account has an Xbox profile and can play Minecraft: Java Edition, then try again.')
    }
    throw new Error(`Minecraft sign-in failed: ${detail}`)
  }
  if (!result.token) throw new Error('Failed to obtain a Minecraft access token')
  if (!result.profile || result.profile.error) {
    const reason = result.profile?.error ?? 'unknown error'
    throw new Error(`This Microsoft account does not own Minecraft: Java Edition (${reason})`)
  }

  return {
    accessToken: result.token,
    refreshToken: token.refresh_token,
    profile: {
      id: result.profile.id,
      name: result.profile.name
    },
    // Minecraft access tokens are valid for roughly 24 hours.
    expiresAt: Date.now() + 23 * 60 * 60 * 1000
  }
}

async function pollDeviceCode (deviceCode) {
  if (!deviceCode) throw new Error('deviceCode is required')

  const { ok, data } = await requestToken({
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
  })

  if (!ok || data.error) {
    if (data.error === 'authorization_pending') {
      return { pending: true }
    }
    if (data.error === 'slow_down') {
      return { pending: true, slowDown: true }
    }
    if (data.error === 'expired_token') {
      throw new Error('The sign-in code expired. Please start again.')
    }
    if (data.error === 'authorization_declined') {
      throw new Error('Sign-in was cancelled.')
    }
    throw new Error(data.error_description || data.error || 'Microsoft sign-in failed')
  }

  return { session: await exchangeMinecraftSession(data) }
}

async function refreshSession (refreshToken) {
  if (!refreshToken) throw new Error('refreshToken is required')

  const { ok, data } = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: SCOPE
  })

  if (!ok || data.error) {
    const err = new Error(data.error_description || data.error || 'Could not refresh Microsoft sign-in')
    err.code = data.error
    throw err
  }

  return exchangeMinecraftSession(data)
}

module.exports = {
  CLIENT_ID,
  requestDeviceCode,
  pollDeviceCode,
  refreshSession
}
